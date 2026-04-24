import { Queue, Job } from "bullmq";
import { redisConnection } from "../connection.js";

export const LEARNING_QUEUE = "learning";

export interface ProcessLearningEventJobData {
  learningEventId: string;
}

export interface UpdateBestPracticesJobData {
  businessId: string;
}

/**
 * Queue for learning system jobs.
 * Processes analytics events and updates performance patterns.
 */
export const learningQueue = new Queue<ProcessLearningEventJobData | UpdateBestPracticesJobData>(
  LEARNING_QUEUE,
  {
    connection: redisConnection,
    defaultJobOptions: {
      attempts: 3,
      backoff: {
        type: "exponential",
        delay: 5000,
      },
    },
  }
);

/**
 * Add a process learning event job
 */
export async function addProcessLearningEventJob(learningEventId: string): Promise<Job<ProcessLearningEventJobData>> {
  return learningQueue.add(
    "process-learning-event",
    { learningEventId },
    {
      jobId: `learning-event-${learningEventId}`,
      removeOnComplete: 50,
      removeOnFail: 10,
    }
  );
}

/**
 * Add an update best practices job
 */
export async function addUpdateBestPracticesJob(businessId: string): Promise<Job<UpdateBestPracticesJobData>> {
  return learningQueue.add(
    "update-best-practices",
    { businessId },
    {
      jobId: `best-practices-${businessId}`,
      removeOnComplete: 5,
      removeOnFail: 5,
    }
  );
}
