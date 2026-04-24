import { ingestionQueue } from "../queues/ingestion.queue.js";

export async function registerIngestionScheduler(): Promise<void> {
  // Add a repeat job to refresh RSS feeds every 6 hours
  await ingestionQueue.add(
    "refresh-rss",
    {},
    {
      repeat: {
        every: 6 * 60 * 60 * 1000, // 6 hours
      },
      jobId: "rss-refresh-scheduler", // Unique ID to prevent duplicates
    }
  );

  console.log("[Ingestion Scheduler] Registered RSS refresh every 6 hours");
}

export async function removeIngestionScheduler(): Promise<void> {
  // Remove the repeat job
  const repeatJobs = await ingestionQueue.getRepeatableJobs();
  for (const job of repeatJobs) {
    if (job.id === "rss-refresh-scheduler") {
      await ingestionQueue.removeRepeatableByKey(job.key);
    }
  }
  console.log("[Ingestion Scheduler] Removed RSS refresh scheduler");
}
