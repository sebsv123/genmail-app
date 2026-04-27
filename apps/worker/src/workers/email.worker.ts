import { Worker } from "bullmq";
import {
  EMAIL_SENDING_QUEUE,
  type SendEmailJobData,
  getRedisConnection,
  registerSequenceScheduler,
  removeSequenceScheduler,
  getOptimalSendTime,
} from "@genmail/queue";
import { db, searchSimilarChunks } from "@genmail/db";
import { listmonk } from "../lib/listmonk-client.js";
import { generateEmail, searchContext } from "../lib/ai-client.js";
import {
  getBestPractices,
  isOptimalSendTime,
  getOptimalSendDelay,
} from "../lib/best-practices.js";

export function createEmailWorker(): Worker {
  const worker = new Worker<SendEmailJobData>(
    EMAIL_SENDING_QUEUE,
    async (job) => {
      const { enrollmentId, attempt = 1 } = job.data;
      console.log(`[Email Worker] Processing job ${job.id}, enrollment ${enrollmentId}, attempt ${attempt}`);

      // Load enrollment with all related data
      const enrollment = await db.sequenceEnrollment.findUnique({
        where: { id: enrollmentId },
        include: {
          lead: {
            include: {
              memory: true,
            },
          },
          sequence: {
            include: {
              business: {
                include: {
                  knowledgeSources: true,
                },
              },
              templates: true,
            },
          },
        },
      });

      if (!enrollment) {
        throw new Error(`Enrollment ${enrollmentId} not found`);
      }

      if (enrollment.status !== "ACTIVE") {
        console.log(`[Email Worker] Enrollment ${enrollmentId} is not active`);
        return { skipped: true, reason: "not_active" };
      }

      const template = enrollment.sequence.templates.find(
        (t) => t.stepNumber === enrollment.currentStep
      );
      if (!template) {
        // NURTURING_INFINITE mode - generate without template
        if (enrollment.sequence.mode !== "NURTURING_INFINITE") {
          throw new Error(`No template found for enrollment ${enrollmentId} step ${enrollment.currentStep}`);
        }
      }

      // ============== RAG: Retrieve Context ==============
      const relevantSources = await retrieveContext(
        enrollment.sequence.businessId,
        enrollment.lead,
        template?.goal || enrollment.sequence.goal || "Engage with lead"
      );

      // ============== LEARNING: Get Optimization Hints ==============
      const bestPractices = await getBestPractices(enrollment.sequence.businessId);
      const leadMemory = enrollment.lead.memory;

      // ============== A/B TESTING: Decide Variant ==============
      let abVariantId: string | undefined;
      let useVariantContent: { subject?: string; bodyHtml?: string; bodyText?: string } | undefined;

      const abDecision = await decideABVariant(enrollment);
      if (abDecision.useVariant && abDecision.variantId) {
        abVariantId = abDecision.variantId;

        // Load variant content
        const variant = await db.aBVariant.findUnique({
          where: { id: abVariantId },
        });

        if (variant && variant.subject && variant.bodyHtml) {
          useVariantContent = {
            subject: variant.subject,
            bodyHtml: variant.bodyHtml,
            bodyText: variant.bodyText,
          };
          console.log(`[Email Worker] Using A/B variant ${variant.name} for enrollment ${enrollmentId}`);
        }
      } else if (abDecision.createTest && abDecision.testType) {
        // Create new A/B test
        console.log(`[Email Worker] Creating new A/B test (${abDecision.testType}) for sequence ${enrollment.sequenceId}`);
        const { addCreateABTestJob } = await import("@genmail/queue");
        await addCreateABTestJob({
          enrollmentId,
          testType: abDecision.testType,
        });
      }

      // Check if we should delay for optimal send time
      if (bestPractices?.bestSendTime && !isOptimalSendTime(bestPractices.bestSendTime)) {
        const delay = getOptimalSendDelay(bestPractices.bestSendTime);
        if (delay && delay > 0) {
          console.log(`[Email Worker] Delaying email ${enrollment.id} for optimal send time (${delay}ms)`);
          // Re-queue the job with delay
          const { emailQueue } = await import("@genmail/queue");
          await emailQueue.add(
            "send-email",
            { enrollmentId: enrollment.id },
            { delay }
          );
          return { delayed: true, delayMs: delay };
        }
      }

      // Prepare optimization hints for AI
      const optimizationHints = bestPractices ? {
        bestFramework: bestPractices.bestFramework,
        bestSubjectStyle: bestPractices.bestSubjectStyle,
        bestLength: bestPractices.bestLength,
        bestHookType: bestPractices.bestHookType,
        bestCTAType: bestPractices.bestCTAType,
        personalOpenRate: leadMemory?.personalOpenRate,
        confidenceLevel: bestPractices.confidenceLevel,
      } : undefined;

      // Load sector context if available
      const sector = enrollment.sequence.business.sector;
      let sectorContext: any = undefined;

      if (sector) {
        const [benchmark, vocabularies, insights, templates] = await Promise.all([
          db.sectorBenchmark.findUnique({ where: { sector } }),
          db.sectorVocabulary.findMany({ where: { sector }, take: 20 }),
          db.sectorInsight.findMany({ where: { sector }, take: 10, orderBy: { weight: 'desc' } }),
          db.sectorTemplate.findMany({
            where: { sector, isActive: true },
            orderBy: { qualityScore: 'desc' },
            take: 3,
          }),
        ]);

        if (benchmark) {
          sectorContext = {
            benchmark: {
              avgOpenRate: benchmark.avgOpenRate,
              avgClickRate: benchmark.avgClickRate,
              bestFrameworks: benchmark.bestFrameworks,
              bestDayOfWeek: benchmark.bestDayOfWeek,
              bestHourRange: benchmark.bestHourRange,
              avgEmailLength: benchmark.avgEmailLength,
            },
            vocabulary: {
              preferred: vocabularies.filter(v => v.type === 'PREFERRED').flatMap(v => v.words),
              prohibited: vocabularies.filter(v => v.type === 'PROHIBITED').flatMap(v => v.words),
              powerWords: vocabularies.filter(v => v.type === 'POWER_WORDS').flatMap(v => v.words),
            },
            insights: insights.map(i => ({
              type: i.insightType,
              title: i.title,
              description: i.description,
            })),
            referenceTemplates: templates.map(t => ({
              subject: t.subject,
              bodyText: t.bodyText.slice(0, 500), // First 500 chars
              framework: t.copyFramework,
              qualityScore: t.qualityScore,
            })),
          };
        }

        // ============== TRENDS: Analyze recent sector trends (FASE 18F) ==============
        const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
        const recentTrends = await db.sectorTrend.findMany({
          where: {
            sector,
            recordedAt: { gte: oneDayAgo },
            trendScore: { gt: 65 },
          },
          orderBy: { trendScore: 'desc' },
          take: 5,
        });

        if (recentTrends.length > 0) {
          try {
            // Call AI service to analyze trends
            const trendResponse = await fetch(`${process.env.AI_SERVICE_URL || 'http://localhost:8000'}/analyze-trend-context`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                sector,
                trends: recentTrends.map(t => ({
                  keyword: t.keyword,
                  score: t.trendScore,
                  weekly_change: t.weeklyChange,
                })),
              }),
            });

            if (trendResponse.ok) {
              const trendAnalysis = await trendResponse.json();
              
              // Add trend context if urgency is high or medium
              if (trendAnalysis.urgency_level === 'high' || trendAnalysis.urgency_level === 'medium') {
                sectorContext = {
                  ...sectorContext,
                  trend_context: {
                    trend_summary: trendAnalysis.summary,
                    recommended_hook: trendAnalysis.recommended_hook,
                    urgency_level: trendAnalysis.urgency_level,
                  },
                };
                console.log(`[Email Worker] Added trend context: ${trendAnalysis.summary}`);
              }
            }
          } catch (error) {
            console.warn('[Email Worker] Failed to analyze trends:', error);
            // Continue without trend context
          }
        }
      }

      // Call AI service to generate email
      const aiResponse = await generateEmail({
        enrollment_id: enrollment.id,
        lead_id: enrollment.leadId,
        business_id: enrollment.sequence.businessId,
        lead_context: {
          name: enrollment.lead.name,
          email: enrollment.lead.email,
          context_data: enrollment.lead.contextData as Record<string, unknown>,
        },
        brand_voice: enrollment.sequence.business.brandVoice || "",
        prohibited_claims: (enrollment.sequence.business.prohibitedClaims as string[]) || [],
        sequence_goal: enrollment.sequence.goal || "Engage with lead",
        sequence_mode: enrollment.sequence.mode,
        step_number: enrollment.currentStep,
        template: template
          ? {
              subject: template.subject,
              body_html: template.bodyHtml,
              body_text: template.bodyText,
              copy_framework: template.copyFramework || "AIDA",
              goal: template.goal || enrollment.sequence.goal || "",
            }
          : {
              subject: `Follow-up: ${enrollment.sequence.name}`,
              body_html: "", // AI will generate this
              body_text: "", // AI will generate this
              copy_framework: "AIDA",
              goal: enrollment.sequence.goal || "Engage",
            },
        lead_memory: {
          topics: (enrollment.lead.leadMemory?.topics as string[]) || [],
          hooks: (enrollment.lead.leadMemory?.hooks as string[]) || [],
          ctas: (enrollment.lead.leadMemory?.ctas as string[]) || [],
          tone: enrollment.lead.leadMemory?.tone || "",
        },
        knowledge_sources: relevantSources.length > 0
          ? relevantSources.map((chunk) => ({
              type: chunk.metadata?.sourceType || "RAG",
              content: chunk.content,
              similarity: chunk.similarity,
            }))
          : enrollment.sequence.business.knowledgeSources.map((ks) => ({
              type: ks.type,
              content: ks.content,
            })),
        send_day: new Date().toLocaleDateString("es-ES", { weekday: "long" }),
        send_time: new Date().toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" }),
        timezone: "Europe/Madrid",
        sector_context: sectorContext,
      });

      if (!aiResponse) {
        throw new Error("AI service returned null");
      }

      // Create GeneratedEmail record
      const generatedEmail = await db.generatedEmail.create({
        data: {
          enrollmentId: enrollment.id,
          templateId: template?.id || null,
          subject: aiResponse.subject,
          bodyHtml: aiResponse.body_html,
          bodyText: aiResponse.body_text,
          qualityScore: aiResponse.quality_score,
          qualityRationale: aiResponse.generation_notes?.join("; ") || "",
          status: aiResponse.quality_score >= 0.7 ? "APPROVED" : "PENDING_REVIEW",
          personalizationUsed: aiResponse.personalization_notes,
          frameworkUsed: aiResponse.copy_framework_used,
        },
      });

      // If quality score is low, don't send - wait for manual review
      if (aiResponse.quality_score < 0.7) {
        console.log(`[Email Worker] Email ${generatedEmail.id} needs review (score: ${aiResponse.quality_score})`);
        return { sent: false, reason: "needs_review", qualityScore: aiResponse.quality_score };
      }

      // Send via Listmonk
      try {
        // Create or update subscriber
        const subscriber = await listmonk.createOrUpdateSubscriber({
          email: enrollment.lead.email,
          name: enrollment.lead.name,
          status: "enabled",
        });

        // Create and send campaign
        const campaign = await listmonk.createCampaign({
          name: `${enrollment.sequence.name} - Step ${enrollment.currentStep} - ${enrollment.lead.name}`,
          subject: aiResponse.subject,
          lists: [], // Direct send to subscriber
          type: "regular",
          contentType: "html",
          body: aiResponse.body_html,
          altbody: aiResponse.body_text,
          sendTo: [subscriber.id],
        });

        await listmonk.startCampaign(campaign.id);

        // Update GeneratedEmail status
        await db.generatedEmail.update({
          where: { id: generatedEmail.id },
          data: {
            status: "SENT",
            sentAt: new Date(),
          },
        });

        // Record analytics event
        await db.analyticsEvent.create({
          data: {
            enrollmentId: enrollment.id,
            generatedEmailId: generatedEmail.id,
            eventType: "SENT",
            metadata: {},
          },
        });

        // Update LeadMemory
        if (enrollment.lead.leadMemory) {
          await db.leadMemory.update({
            where: { id: enrollment.lead.leadMemory.id },
            data: {
              hooks: [...((enrollment.lead.leadMemory.hooks as string[]) || []), aiResponse.personalization_notes],
              ctas: [...((enrollment.lead.leadMemory.ctas as string[]) || [])],
            },
          });
        }

        // Update enrollment - advance step or cycle
        const nextStep = enrollment.currentStep + 1;
        const hasNextTemplate = enrollment.sequence.emailTemplates.some(
          (t) => t.stepNumber === nextStep
        );

        if (hasNextTemplate || enrollment.sequence.mode === "NURTURING_INFINITE") {
          await db.sequenceEnrollment.update({
            where: { id: enrollment.id },
            data: {
              currentStep: nextStep,
              lastEmailSentAt: new Date(),
            },
          });
        } else if (enrollment.sequence.mode === "EVERGREEN") {
          // Cycle back to step 1
          await db.sequenceEnrollment.update({
            where: { id: enrollment.id },
            data: {
              currentStep: 1,
              lastEmailSentAt: new Date(),
            },
          });
        } else {
          // Complete
          await db.sequenceEnrollment.update({
            where: { id: enrollment.id },
            data: {
              status: "COMPLETED",
              completedAt: new Date(),
              lastEmailSentAt: new Date(),
            },
          });
        }

        console.log(`[Email Worker] Email sent successfully: ${generatedEmail.id}`);
        return { sent: true, generatedEmailId: generatedEmail.id };
      } catch (error) {
        console.error(`[Email Worker] Failed to send email ${generatedEmail.id}:`, error);
        
        // Update status to failed
        await db.generatedEmail.update({
          where: { id: generatedEmail.id },
          data: { status: "FAILED" },
        });

        throw error;
      }
    },
    {
      connection: getRedisConnection(),
      concurrency: 5,
    }
  );

  worker.on("completed", (job, result) => {
    console.log(`[Email Worker] Job ${job.id} completed:`, result);
  });

  worker.on("failed", (job, err) => {
    console.error(`[Email Worker] Job ${job?.id} failed:`, err);
  });

  return worker;
}

/**
 * Retrieve relevant context for email generation using RAG
 */
async function retrieveContext(
  businessId: string,
  lead: any,
  stepGoal: string
): Promise<Array<{ content: string; similarity: number; metadata: any }>> {
  try {
    // Build search query combining step goal, lead stage, and context data
    const contextData = lead.contextData as Record<string, any> || {};
    const keywords = Object.values(contextData).filter(Boolean).join(" ");
    
    const query = [
      stepGoal,
      lead.stage,
      keywords,
      lead.name,
    ].filter(Boolean).join(" ");

    if (!query.trim()) {
      return [];
    }

    // Get query embedding from AI service
    const searchResult = await searchContext({
      business_id: businessId,
      query,
      limit: 5,
    });

    // Search similar chunks in database using pgvector
    const chunks = await searchSimilarChunks(
      db,
      businessId,
      searchResult.query_embedding,
      5
    );

    // Filter by similarity threshold (>= 0.75)
    const relevantChunks = chunks.filter(
      (chunk) => chunk.similarity >= 0.75
    );

    console.log(`[Email Worker] RAG: Found ${relevantChunks.length} relevant chunks (query: "${query.substring(0, 50)}...")`);

    return relevantChunks.map((chunk) => ({
      content: chunk.content,
      similarity: chunk.similarity,
      metadata: chunk.metadata,
    }));
  } catch (error) {
    console.error("[Email Worker] RAG retrieval failed:", error);
    // Return empty array on failure - will fallback to regular knowledge sources
    return [];
  }
}

/**
 * A/B TESTING: Decide which variant to use for this enrollment
 */
async function decideABVariant(enrollment: any): Promise<{
  useVariant: boolean;
  variantId?: string;
  createTest?: boolean;
  testType?: string;
}> {
  const sequenceId = enrollment.sequenceId;
  const leadId = enrollment.leadId;

  // Check for completed test with winner - use winner always
  const completedTest = await db.aBTest.findFirst({
    where: {
      sequenceId,
      status: "COMPLETED",
      winnerVariantId: { not: null },
    },
  });

  if (completedTest?.winnerVariantId) {
    return { useVariant: true, variantId: completedTest.winnerVariantId };
  }

  // Check for running test - assign by leadId hash
  const runningTest = await db.aBTest.findFirst({
    where: {
      sequenceId,
      status: "RUNNING",
    },
    include: { variants: true },
  });

  if (runningTest && runningTest.variants.length === 2) {
    const hash = hashString(leadId);
    const assignedVariant = hash % 2 === 0 ? runningTest.variants[0] : runningTest.variants[1];
    return { useVariant: true, variantId: assignedVariant.id };
  }

  // Decide if we should create a new test
  const emailsSent = await db.generatedEmail.count({
    where: {
      enrollment: { sequenceId },
    },
  });

  if (emailsSent >= 20) {
    const activeTests = await db.aBTest.count({
      where: { sequenceId, status: "RUNNING" },
    });

    if (activeTests === 0 && Math.random() < 0.3) {
      // 30% probability to create test
      const testType = await determineTestType(enrollment.sequence.businessId);
      return { useVariant: false, createTest: true, testType };
    }
  }

  return { useVariant: false };
}

/**
 * Helper: Simple hash function for consistent variant assignment
 */
function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash);
}

/**
 * Helper: Determine test type based on least explored patterns
 */
async function determineTestType(businessId: string): Promise<string> {
  const patterns = await db.performancePattern.groupBy({
    by: ["patternType"],
    where: { businessId },
    _count: { id: true },
  });

  const allTypes = ["SUBJECT_LINE", "COPY_FRAMEWORK", "EMAIL_LENGTH", "CTA_TYPE", "SEND_TIME"];
  const typeCounts: Record<string, number> = {};

  allTypes.forEach((type) => (typeCounts[type] = 0));
  patterns.forEach((p: any) => (typeCounts[p.patternType] = p._count.id));

  const sorted = allTypes.sort((a, b) => typeCounts[a] - typeCounts[b]);
  return sorted[0];
}
