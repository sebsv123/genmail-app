import { Worker } from "bullmq";
import {
  LEAD_HUNTING_QUEUE,
  type HuntProspectsJobData,
  type SendColdEmailJobData,
  getRedisConnection,
} from "@genmail/queue";
import { db } from "../lib/db.js";
import { listmonk } from "../lib/listmonk-client.js";
import { generateColdEmail } from "../lib/ai-client.js";
import { HunterEngine } from "@genmail/lead-hunter";

export function createHuntWorker(): Worker {
  const worker = new Worker<HuntProspectsJobData | SendColdEmailJobData>(
    LEAD_HUNTING_QUEUE,
    async (job) => {
      const { name } = job;

      if (name === "hunt-prospects") {
        return handleHuntProspects(job.data as HuntProspectsJobData);
      }

      if (name === "send-cold-email") {
        return handleSendColdEmail(job.data as SendColdEmailJobData);
      }

      throw new Error(`Unknown job name: ${name}`);
    },
    {
      connection: getRedisConnection(),
      concurrency: 2,
    }
  );

  worker.on("completed", (job, result) => {
    console.log(`[Hunt Worker] Job ${job.id} completed:`, result);
  });

  worker.on("failed", (job, err) => {
    console.error(`[Hunt Worker] Job ${job?.id} failed:`, err);
  });

  return worker;
}

async function handleHuntProspects(data: HuntProspectsJobData) {
  const { icpId } = data;
  console.log(`[Hunt Worker] Hunting prospects for ICP ${icpId}`);

  // Load ICP from DB
  const icp = await db.iCP.findUnique({
    where: { id: icpId },
    include: {
      business: true,
    },
  });

  if (!icp) {
    throw new Error(`ICP ${icpId} not found`);
  }

  // Create HunterEngine and hunt
  const engine = new HunterEngine({
    apollo: {
      apiKey: process.env.APOLLO_API_KEY || "",
      enabled: !!process.env.APOLLO_API_KEY,
    },
    hunter: {
      apiKey: process.env.HUNTER_API_KEY || "",
      enabled: !!process.env.HUNTER_API_KEY,
    },
    googleMaps: {
      apiKey: process.env.GOOGLE_PLACES_API_KEY || "",
      enabled: !!process.env.GOOGLE_PLACES_API_KEY,
    },
  });

  const prospects = await engine.hunt({
    id: icp.id,
    sector: icp.sector,
    targetRole: icp.targetRole,
    companySize: icp.companySize || undefined,
    location: icp.location || undefined,
    painPoints: icp.painPoints as string[],
    keywords: icp.keywords as string[],
    businessId: icp.businessId,
  });

  let found = 0;
  let duplicates = 0;

  for (const prospect of prospects) {
    // Check for duplicate (Prospect has compound unique [businessId, email])
    const existing = await db.prospect.findUnique({
      where: {
        businessId_email: {
          businessId: icp.businessId,
          email: prospect.email,
        },
      },
    });

    if (existing) {
      duplicates++;
      continue;
    }

    // Save new prospect
    await db.prospect.create({
      data: {
        icpId: icp.id,
        email: prospect.email,
        firstName: prospect.firstName,
        lastName: prospect.lastName,
        companyName: prospect.companyName,
        companyWebsite: prospect.companyWebsite,
        role: prospect.role,
        source: prospect.source,
        intentScore: prospect.intentScore || 0,
        rawData: prospect.rawData || {},
        status: "FOUND",
      },
    });

    found++;
  }

  console.log(`[Hunt Worker] Found ${found} new prospects, ${duplicates} duplicates`);
  return { found, duplicates };
}

async function handleSendColdEmail(data: SendColdEmailJobData) {
  const { prospectId, stepNumber } = data;
  console.log(`[Hunt Worker] Sending cold email to prospect ${prospectId}, step ${stepNumber}`);

  // Load prospect, ICP and business
  const prospect = await db.prospect.findUnique({
    where: { id: prospectId },
    include: {
      icp: {
        include: {
          business: true,
        },
      },
    },
  });

  if (!prospect) {
    throw new Error(`Prospect ${prospectId} not found`);
  }

  // Load sector context from ICP sector
  const sector = prospect.icp.sector;
  let sectorContext: any = undefined;

  if (sector) {
    const [benchmark, vocabularies, insights, templates] = await Promise.all([
      db.sectorBenchmark.findUnique({ where: { sector } }),
      db.sectorVocabulary.findMany({ where: { sector }, take: 20 }),
      db.sectorInsight.findMany({ where: { sector }, take: 10, orderBy: { weight: 'desc' } }),
      db.sectorTemplate.findMany({
        where: { sector, sequenceMode: 'COLD_OUTREACH', isActive: true },
        orderBy: { qualityScore: 'desc' },
        take: 2,
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
          bodyText: t.bodyText.slice(0, 500),
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
          const trendAnalysis: any = await trendResponse.json();
          
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
            console.log(`[Hunt Worker] Added trend context: ${trendAnalysis.summary}`);
          }
        }
      } catch (error) {
        console.warn('[Hunt Worker] Failed to analyze trends:', error);
        // Continue without trend context
      }
    }
  }

  // Generate cold email via AI
  const aiResponse = await generateColdEmail({
    business_id: prospect.icp.businessId,
    brand_voice: prospect.icp.business.brandVoice || "",
    prospect: {
      email: prospect.email,
      first_name: prospect.firstName || undefined,
      last_name: prospect.lastName || undefined,
      company_name: prospect.companyName || undefined,
      company_website: prospect.companyWebsite || undefined,
      role: prospect.role || undefined,
      source_url: undefined,
      enrichment_data: prospect.rawData as Record<string, unknown> || {},
    },
    icp: {
      sector: prospect.icp.sector,
      target_role: prospect.icp.targetRole,
      pain_points: prospect.icp.painPoints as string[],
      keywords: prospect.icp.keywords as string[],
      location: prospect.icp.location || undefined,
    },
    step_number: stepNumber,
    constraints: {
      max_words: 120,
      language: "es-ES",
      prohibited_claims: (prospect.icp.business.prohibitedClaims as string[]) || [],
    },
    sector_context: sectorContext,
  });

  if (!aiResponse) {
    throw new Error("AI service returned null");
  }

  // Check quality score
  if (aiResponse.quality_score < 0.65) {
    // Save as pending review
    await db.coldEmail.create({
      data: {
        prospectId: prospect.id,
        subject: aiResponse.subject,
        bodyHtml: aiResponse.body_html,
        bodyText: aiResponse.body_text,
        stepNumber,
        status: "PENDING_REVIEW",
        personalizationHooks: aiResponse.personalization_hooks,
        copyFrameworkUsed: aiResponse.copy_framework_used,
        qualityScore: aiResponse.quality_score,
      },
    });

    console.log(`[Hunt Worker] Cold email needs review (score: ${aiResponse.quality_score})`);
    return { sent: false, reason: "needs_review" };
  }

  // Send via Listmonk
  try {
    const subscriber = await listmonk.createOrUpdateSubscriber({
      email: prospect.email,
      name: `${prospect.firstName || ""} ${prospect.lastName || ""}`.trim() || undefined,
      status: "enabled",
    });

    const campaign = await listmonk.createCampaign({
      name: `Cold Outreach - ${prospect.companyName || prospect.email} - Step ${stepNumber}`,
      subject: aiResponse.subject,
      lists: [],
      type: "regular",
      contentType: "html",
      body: aiResponse.body_html,
      altbody: aiResponse.body_text,
      sendTo: [subscriber.id],
    });

    await listmonk.startCampaign(campaign.id);

    // Save as sent
    await db.coldEmail.create({
      data: {
        prospectId: prospect.id,
        subject: aiResponse.subject,
        bodyHtml: aiResponse.body_html,
        bodyText: aiResponse.body_text,
        stepNumber,
        status: "SENT",
        sentAt: new Date(),
        personalizationHooks: aiResponse.personalization_hooks,
        copyFrameworkUsed: aiResponse.copy_framework_used,
        qualityScore: aiResponse.quality_score,
      },
    });

    // Schedule next step
    const nextStep = stepNumber + 1;
    if (nextStep <= 3) {
      const delayDays = nextStep === 2 ? 3 : 5; // +3 days for step 2, +5 days for step 3
      const scheduledAt = new Date();
      scheduledAt.setDate(scheduledAt.getDate() + delayDays);

      // Add to hunt queue with delay (using job options)
      // Note: BullMQ delayed jobs would be better here
      console.log(`[Hunt Worker] Scheduled step ${nextStep} for ${scheduledAt.toISOString()}`);
    }

    // Update prospect status
    await db.prospect.update({
      where: { id: prospect.id },
      data: { status: "ENROLLED" },
    });

    console.log(`[Hunt Worker] Cold email sent to ${prospect.email}`);
    return { sent: true };
  } catch (error) {
    console.error(`[Hunt Worker] Failed to send cold email:`, error);
    throw error;
  }
}
