import { learningQueue } from "../queues/learning.queue.js";

/**
 * Register the best practices scheduler for all businesses.
 * Runs every 24 hours to update best practices from performance patterns.
 */
export async function registerLearningScheduler(): Promise<void> {
  // The scheduler will be triggered per business from the alerts worker
  // This is a placeholder for any global learning tasks
  console.log("[Learning Scheduler] Registered");
}

export async function removeLearningScheduler(): Promise<void> {
  const repeatJobs = await learningQueue.getRepeatableJobs();
  for (const job of repeatJobs) {
    await learningQueue.removeRepeatableByKey(job.key);
  }
  console.log("[Learning Scheduler] Removed");
}
