import { sequenceQueue } from "../queues/sequence.queue.js";

export async function registerSequenceScheduler(): Promise<void> {
  // Add a repeat job to process all sequences every 5 minutes
  await sequenceQueue.add(
    "process-all-sequences",
    { scheduled: true },
    {
      repeat: {
        every: 5 * 60 * 1000, // 5 minutes
      },
      jobId: "sequence-scheduler", // Unique ID to prevent duplicates
    }
  );

  console.log("[Sequence Scheduler] Registered repeat job every 5 minutes");
}

export async function removeSequenceScheduler(): Promise<void> {
  // Remove the repeat job
  const repeatJobs = await sequenceQueue.getRepeatableJobs();
  for (const job of repeatJobs) {
    await sequenceQueue.removeRepeatableByKey(job.key);
  }
  console.log("[Sequence Scheduler] Removed repeat job");
}

/**
 * Calculate optimal send time for a lead based on:
 * 1. LeadMemory.bestSendTime (if available) - priority 1
 * 2. SectorBenchmark.bestDayOfWeek + bestHourRange (if sector available) - priority 2
 * 3. Default: send now
 *
 * @param leadMemory - Lead memory data with bestSendTime
 * @param sectorBenchmark - Sector benchmark data with timing preferences
 * @param maxDelayHours - Maximum delay (default 48h)
 * @returns Date - Optimal send time
 */
export function getOptimalSendTime(
  leadMemory?: { bestSendTime?: string | null } | null,
  sectorBenchmark?: { bestDayOfWeek?: string | null; bestHourRange?: string | null } | null,
  maxDelayHours: number = 48
): Date {
  const now = new Date();
  const maxDelay = new Date(now.getTime() + maxDelayHours * 60 * 60 * 1000);

  // Priority 1: Lead's personal best send time
  if (leadMemory?.bestSendTime) {
    const personalTime = new Date(leadMemory.bestSendTime);
    if (personalTime > now && personalTime <= maxDelay) {
      return personalTime;
    }
  }

  // Priority 2: Sector benchmark timing
  if (sectorBenchmark?.bestDayOfWeek && sectorBenchmark?.bestHourRange) {
    const dayMap: Record<string, number> = {
      "lunes": 1, "monday": 1,
      "martes": 2, "tuesday": 2,
      "miercoles": 3, "miércoles": 3, "wednesday": 3,
      "jueves": 4, "thursday": 4,
      "viernes": 5, "friday": 5,
      "sabado": 6, "sábado": 6, "saturday": 6,
      "domingo": 0, "sunday": 0,
    };

    const targetDay = dayMap[sectorBenchmark.bestDayOfWeek.toLowerCase()];
    if (targetDay !== undefined) {
      // Parse hour range (e.g., "10-12" or "9-11")
      const hourMatch = sectorBenchmark.bestHourRange.match(/(\d+)[-\s]+(\d+)/);
      if (hourMatch) {
        const startHour = parseInt(hourMatch[1], 10);
        // const endHour = parseInt(hourMatch[2], 10);

        // Find next occurrence of target day
        const candidate = new Date(now);
        candidate.setDate(candidate.getDate() + ((targetDay - candidate.getDay() + 7) % 7 || 7));
        candidate.setHours(startHour, 0, 0, 0);

        // If today is the target day but we've passed the hour, move to next week
        if (candidate <= now) {
          candidate.setDate(candidate.getDate() + 7);
        }

        // Check if within max delay
        if (candidate <= maxDelay) {
          return candidate;
        }
      }
    }
  }

  // Default: Send now + small delay to avoid immediate processing issues
  return new Date(now.getTime() + 5 * 60 * 1000); // 5 minutes from now
}
