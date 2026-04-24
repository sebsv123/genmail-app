import { Worker, Job } from "bullmq";
import { redisConnection, LEARNING_QUEUE } from "@genmail/queue";
import { db, PatternType, LearningEventType } from "@genmail/db";

// Types for job data
interface ProcessLearningEventJobData {
  learningEventId: string;
}

interface UpdateBestPracticesJobData {
  businessId: string;
}

interface BestPracticesCache {
  bestFramework?: string;
  bestSubjectStyle?: string;
  bestLength?: string;
  bestSendTime?: string;
  bestHookType?: string;
  bestCTAType?: string;
  confidenceLevel: "low" | "medium" | "high";
  lastUpdated: string;
}

/**
 * Learning Worker: Processes analytics events and learns from them
 * Concurrencia: 1 (para evitar race conditions)
 */
export const learningWorker = new Worker<ProcessLearningEventJobData | UpdateBestPracticesJobData>(
  LEARNING_QUEUE,
  async (job: Job<ProcessLearningEventJobData | UpdateBestPracticesJobData>) => {
    const jobName = job.name;
    const jobId = job.id;

    console.log(`[LearningWorker] Processing ${jobName} (${jobId})`);

    try {
      switch (jobName) {
        case "process-learning-event":
          return await processLearningEvent(job.data as ProcessLearningEventJobData);
        case "update-best-practices":
          return await processUpdateBestPractices(job.data as UpdateBestPracticesJobData);
        default:
          throw new Error(`Unknown job type: ${jobName}`);
      }
    } catch (error) {
      console.error(`[LearningWorker] Error processing ${jobName}:`, error);
      throw error;
    }
  },
  {
    connection: redisConnection,
    concurrency: 1, // Prevent race conditions
  }
);

/**
 * Process Learning Event: Update LeadMemory and PerformancePatterns
 */
async function processLearningEvent(data: ProcessLearningEventJobData): Promise<{ processed: boolean }> {
  const { learningEventId } = data;

  // Load learning event
  const event = await db.learningEvent.findUnique({
    where: { id: learningEventId },
    include: {
      email: {
        include: {
          lead: {
            include: {
              leadMemory: true,
            },
          },
        },
      },
    },
  });

  if (!event) {
    throw new Error(`LearningEvent not found: ${learningEventId}`);
  }

  if (event.processedAt) {
    console.log(`[LearningWorker] Event ${learningEventId} already processed`);
    return { processed: false };
  }

  const signals = event.signals as any;
  const lead = event.email?.lead;
  const businessId = event.businessId;

  // 1. Update LeadMemory if we have a lead
  if (lead) {
    await updateLeadMemory(lead.id, event.eventType, signals);
  }

  // 2. Update PerformancePatterns for each signal
  if (signals) {
    await updatePerformancePatterns(businessId, signals, event.eventType);
  }

  // 3. Mark event as processed
  await db.learningEvent.update({
    where: { id: learningEventId },
    data: { processedAt: new Date() },
  });

  console.log(`[LearningWorker] Processed event ${learningEventId}`);
  return { processed: true };
}

/**
 * Update LeadMemory based on event type
 */
async function updateLeadMemory(
  leadId: string,
  eventType: LearningEventType,
  signals: any
): Promise<void> {
  const memory = await db.leadMemory.findUnique({
    where: { leadId },
  });

  if (!memory) {
    // Create memory if doesn't exist
    await db.leadMemory.create({
      data: {
        leadId,
        totalEmailsReceived: eventType === "EMAIL_SENT" ? 1 : 0,
        totalOpened: eventType === "OPENED" ? 1 : 0,
        totalClicked: eventType === "CLICKED" ? 1 : 0,
        totalReplied: eventType === "REPLIED" ? 1 : 0,
        topicsUsed: signals?.topics || [],
        hooksUsed: signals?.hooks || [],
        ctasUsed: signals?.ctas || [],
        claimsMade: [],
      },
    });
    return;
  }

  // Calculate updates
  const updates: any = {};

  switch (eventType) {
    case "EMAIL_SENT":
      updates.totalEmailsReceived = { increment: 1 };
      break;
    case "OPENED":
      updates.totalOpened = { increment: 1 };
      break;
    case "CLICKED":
      updates.totalClicked = { increment: 1 };
      break;
    case "REPLIED":
      updates.totalReplied = { increment: 1 };
      // Calculate avgResponseDelay if we have sentAt and current time
      if (signals?.sentAt) {
        const sentTime = new Date(signals.sentAt).getTime();
        const replyTime = Date.now();
        const delayHours = (replyTime - sentTime) / (1000 * 60 * 60);
        if (memory.avgResponseDelay) {
          // Weighted average
          updates.avgResponseDelay =
            (memory.avgResponseDelay * memory.totalReplied + delayHours) /
            (memory.totalReplied + 1);
        } else {
          updates.avgResponseDelay = delayHours;
        }
      }
      break;
  }

  // Recalculate personal rates
  const totalReceived = memory.totalEmailsReceived + (eventType === "EMAIL_SENT" ? 1 : 0);
  const totalOpened = memory.totalOpened + (eventType === "OPENED" ? 1 : 0);
  const totalClicked = memory.totalClicked + (eventType === "CLICKED" ? 1 : 0);

  if (totalReceived > 0) {
    updates.personalOpenRate = totalOpened / totalReceived;
    updates.personalClickRate = totalClicked / totalReceived;
  }

  // Store best send time if available
  if (signals?.sendTime && eventType === "OPENED") {
    // Only update best send time if this email was opened
    const dayHour = signals.sendTime; // Format: "martes-10"
    if (!memory.bestSendTime) {
      updates.bestSendTime = dayHour;
    }
    // Could implement more sophisticated logic here (track which send times get more opens)
  }

  // Update best framework if this email was replied
  if (signals?.framework && eventType === "REPLIED") {
    if (!memory.bestFramework) {
      updates.bestFramework = signals.framework;
    }
  }

  // Update best hook type if this email was clicked or replied
  if (signals?.hookType && (eventType === "CLICKED" || eventType === "REPLIED")) {
    if (!memory.bestHookType) {
      updates.bestHookType = signals.hookType;
    }
  }

  await db.leadMemory.update({
    where: { leadId },
    data: updates,
  });
}

/**
 * Update PerformancePatterns using weighted moving average
 */
async function updatePerformancePatterns(
  businessId: string,
  signals: any,
  eventType: LearningEventType
): Promise<void> {
  // Helper to update a pattern
  const updatePattern = async (
    patternType: PatternType,
    patternValue: string,
    metricValue: number
  ) => {
    const existing = await db.performancePattern.findUnique({
      where: {
        businessId_patternType_patternValue: {
          businessId,
          patternType,
          patternValue,
        },
      },
    });

    if (existing) {
      // Weighted moving average
      const oldSize = existing.sampleSize;
      const newSize = oldSize + 1;

      const newRate =
        (existing[`${metricValue >= 0 ? getMetricField(eventType) : "openRate"}` as keyof typeof existing] as number * oldSize + metricValue) / newSize;

      // Calculate confidence score based on sample size
      let confidenceScore = existing.confidenceScore;
      if (newSize >= 100) confidenceScore = 1.0;
      else if (newSize >= 30) confidenceScore = 0.85;
      else if (newSize >= 10 && confidenceScore < 0.7) confidenceScore = 0.7;

      const updateData: any = {
        sampleSize: newSize,
        confidenceScore,
        lastUpdated: new Date(),
      };

      // Update the appropriate rate field
      const fieldName = getMetricField(eventType);
      if (fieldName) {
        updateData[fieldName] = newRate;
      }

      await db.performancePattern.update({
        where: { id: existing.id },
        data: updateData,
      });
    } else {
      // Create new pattern
      const createData: any = {
        businessId,
        patternType,
        patternValue,
        sampleSize: 1,
        confidenceScore: 0.3, // Start low until we have more samples
        lastUpdated: new Date(),
      };

      // Set the appropriate rate field
      const fieldName = getMetricField(eventType);
      if (fieldName) {
        createData[fieldName] = metricValue;
      }

      await db.performancePattern.create({ data: createData });
    }
  };

  // Update patterns for each signal type
  if (signals.subject) {
    const subjectStyle = analyzeSubjectStyle(signals.subject);
    await updatePattern("SUBJECT_LINE", subjectStyle, 1);
  }

  if (signals.framework) {
    await updatePattern("COPY_FRAMEWORK", signals.framework, 1);
  }

  if (signals.emailLength) {
    await updatePattern("EMAIL_LENGTH", signals.emailLength, 1);
  }

  if (signals.sendTime) {
    await updatePattern("SEND_TIME", signals.sendTime, 1);
  }

  if (signals.hookType) {
    await updatePattern("HOOK_TYPE", signals.hookType, 1);
  }

  if (signals.ctaType) {
    await updatePattern("CTA_TYPE", signals.ctaType, 1);
  }
}

/**
 * Get the metric field name based on event type
 */
function getMetricField(eventType: LearningEventType): string | null {
  switch (eventType) {
    case "OPENED":
      return "openRate";
    case "CLICKED":
      return "clickRate";
    case "REPLIED":
      return "replyRate";
    case "CONVERTED":
      return "conversionRate";
    default:
      return null;
  }
}

/**
 * Analyze subject style
 */
function analyzeSubjectStyle(subject: string): string {
  if (subject.includes("?")) return "pregunta";
  if (/\d/.test(subject)) return "numero";
  if (/[\u{1F300}-\u{1F9FF}]/u.test(subject)) return "emoji";
  if (/urgente|ahora|inmediato/i.test(subject)) return "urgencia";
  if (/beneficio|ventaja|mejora/i.test(subject)) return "beneficio";
  return "neutro";
}

/**
 * Process Update Best Practices Job
 */
async function processUpdateBestPractices(data: UpdateBestPracticesJobData): Promise<{ cached: boolean }> {
  const { businessId } = data;

  // Find patterns with high confidence
  const patterns = await db.performancePattern.findMany({
    where: {
      businessId,
      confidenceScore: { gte: 0.7 },
    },
  });

  if (patterns.length === 0) {
    console.log(`[LearningWorker] No patterns with high confidence for ${businessId}`);
    return { cached: false };
  }

  // Find best pattern for each type
  const bestPractices: BestPracticesCache = {
    confidenceLevel: "medium",
    lastUpdated: new Date().toISOString(),
  };

  const patternTypes: PatternType[] = [
    "COPY_FRAMEWORK",
    "SUBJECT_LINE",
    "EMAIL_LENGTH",
    "SEND_TIME",
    "HOOK_TYPE",
    "CTA_TYPE",
  ];

  for (const type of patternTypes) {
    const typePatterns = patterns.filter((p) => p.patternType === type);
    if (typePatterns.length === 0) continue;

    // Calculate combined score: (openRate * 0.3) + (clickRate * 0.4) + (replyRate * 0.3)
    const bestPattern = typePatterns.reduce((best, current) => {
      const bestScore = best.openRate * 0.3 + best.clickRate * 0.4 + best.replyRate * 0.3;
      const currentScore = current.openRate * 0.3 + current.clickRate * 0.4 + current.replyRate * 0.3;
      return currentScore > bestScore ? current : best;
    });

    // Map to best practices cache
    switch (type) {
      case "COPY_FRAMEWORK":
        bestPractices.bestFramework = bestPattern.patternValue;
        break;
      case "SUBJECT_LINE":
        bestPractices.bestSubjectStyle = bestPattern.patternValue;
        break;
      case "EMAIL_LENGTH":
        bestPractices.bestLength = bestPattern.patternValue;
        break;
      case "SEND_TIME":
        bestPractices.bestSendTime = bestPattern.patternValue;
        break;
      case "HOOK_TYPE":
        bestPractices.bestHookType = bestPattern.patternValue;
        break;
      case "CTA_TYPE":
        bestPractices.bestCTAType = bestPattern.patternValue;
        break;
    }
  }

  // Determine confidence level based on total sample size
  const totalSamples = patterns.reduce((sum, p) => sum + p.sampleSize, 0);
  if (totalSamples >= 100) bestPractices.confidenceLevel = "high";
  else if (totalSamples >= 30) bestPractices.confidenceLevel = "medium";
  else bestPractices.confidenceLevel = "low";

  // Store in Redis with 24h TTL
  const { redisConnection } = await import("@genmail/queue");
  await redisConnection.setex(
    `best_practices:${businessId}`,
    24 * 60 * 60, // 24 hours
    JSON.stringify(bestPractices)
  );

  console.log(`[LearningWorker] Cached best practices for ${businessId}:`, bestPractices);
  return { cached: true };
}
