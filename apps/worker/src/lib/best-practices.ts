import { redisConnection } from "@genmail/queue";
import { db } from "@genmail/db";

export interface BestPractices {
  bestFramework?: string;
  bestSubjectStyle?: string;
  bestLength?: string;
  bestSendTime?: string;
  bestHookType?: string;
  bestCTAType?: string;
  personalOpenRate?: number;
  confidenceLevel: "low" | "medium" | "high";
}

/**
 * Get best practices from Redis cache or recalculate from DB
 */
export async function getBestPractices(businessId: string): Promise<BestPractices | null> {
  // Try Redis first
  const cached = await redisConnection.get(`best_practices:${businessId}`);
  if (cached) {
    return JSON.parse(cached) as BestPractices;
  }

  // If not in cache, recalculate from DB
  return await recalculateBestPractices(businessId);
}

/**
 * Recalculate best practices from performance patterns
 */
async function recalculateBestPractices(businessId: string): Promise<BestPractices | null> {
  const patterns = await db.performancePattern.findMany({
    where: {
      businessId,
      confidenceScore: { gte: 0.7 },
    },
  });

  if (patterns.length === 0) {
    return null;
  }

  const bestPractices: BestPractices = {
    confidenceLevel: "medium",
  };

  const patternTypes = [
    "COPY_FRAMEWORK",
    "SUBJECT_LINE",
    "EMAIL_LENGTH",
    "SEND_TIME",
    "HOOK_TYPE",
    "CTA_TYPE",
  ] as const;

  for (const type of patternTypes) {
    const typePatterns = patterns.filter((p) => p.patternType === type);
    if (typePatterns.length === 0) continue;

    // Calculate combined score: (openRate * 0.3) + (clickRate * 0.4) + (replyRate * 0.3)
    const bestPattern = typePatterns.reduce((best, current) => {
      const bestScore = best.openRate * 0.3 + best.clickRate * 0.4 + best.replyRate * 0.3;
      const currentScore = current.openRate * 0.3 + current.clickRate * 0.4 + current.replyRate * 0.3;
      return currentScore > bestScore ? current : best;
    });

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

  // Determine confidence level
  const totalSamples = patterns.reduce((sum, p) => sum + p.sampleSize, 0);
  if (totalSamples >= 100) bestPractices.confidenceLevel = "high";
  else if (totalSamples >= 30) bestPractices.confidenceLevel = "medium";
  else bestPractices.confidenceLevel = "low";

  // Cache for 24 hours
  await redisConnection.setex(
    `best_practices:${businessId}`,
    24 * 60 * 60,
    JSON.stringify(bestPractices)
  );

  return bestPractices;
}

/**
 * Check if current time is the optimal send time for a business
 */
export function isOptimalSendTime(bestSendTime?: string): boolean {
  if (!bestSendTime) return true;

  const now = new Date();
  const days = ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"];
  const currentDay = days[now.getDay()];
  const currentHour = now.getHours();

  // Parse best send time format: "martes-10"
  const [bestDay, bestHourStr] = bestSendTime.split("-");
  const bestHour = parseInt(bestHourStr, 10);

  if (isNaN(bestHour)) return true;

  // Check if it's within 2 hours of the optimal time
  const isSameDay = currentDay.toLowerCase() === bestDay.toLowerCase();
  const isOptimalHour = Math.abs(currentHour - bestHour) <= 2;

  return isSameDay && isOptimalHour;
}

/**
 * Schedule email for optimal send time (max 24h delay)
 */
export function getOptimalSendDelay(bestSendTime?: string): number | null {
  if (!bestSendTime) return null;

  const now = new Date();
  const days = ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"];
  const currentDayIndex = now.getDay();
  const currentHour = now.getHours();

  // Parse best send time
  const [bestDay, bestHourStr] = bestSendTime.split("-");
  const bestHour = parseInt(bestHourStr, 10);
  const bestDayIndex = days.findIndex((d) => d.toLowerCase() === bestDay.toLowerCase());

  if (bestDayIndex === -1 || isNaN(bestHour)) return null;

  // Calculate delay
  let dayDiff = bestDayIndex - currentDayIndex;
  if (dayDiff < 0) dayDiff += 7; // Next week

  const hourDiff = bestHour - currentHour;
  const delayMs = (dayDiff * 24 + hourDiff) * 60 * 60 * 1000;

  // Cap at 24 hours max
  return Math.min(delayMs, 24 * 60 * 60 * 1000);
}
