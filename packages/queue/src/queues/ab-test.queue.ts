import { Queue } from "bullmq";
import { redisConnection } from "../config/redis.js";

export const AB_TEST_QUEUE = "ab-test";

export interface CreateABTestJobData {
  type: "create-ab-test";
  enrollmentId: string;
  testType: string;
}

export interface EvaluateABTestJobData {
  type: "evaluate-ab-test";
  testId: string;
}

export interface DecideVariantJobData {
  type: "decide-variant";
  enrollmentId: string;
}

export interface UpdateVariantStatsJobData {
  type: "update-variant-stats";
  abVariantId: string;
  eventType: "OPENED" | "CLICKED" | "REPLIED";
}

export const abTestQueue = new Queue(AB_TEST_QUEUE, {
  connection: redisConnection,
  defaultJobOptions: {
    removeOnComplete: 100,
    removeOnFail: 50,
    attempts: 3,
    backoff: {
      type: "exponential",
      delay: 1000,
    },
  },
});

export async function addCreateABTestJob(data: Omit<CreateABTestJobData, "type">) {
  return await abTestQueue.add("create-ab-test", { type: "create-ab-test", ...data });
}

export async function addEvaluateABTestJob(data: Omit<EvaluateABTestJobData, "type">) {
  return await abTestQueue.add("evaluate-ab-test", { type: "evaluate-ab-test", ...data }, {
    delay: 60000, // Check every minute
    repeat: {
      every: 60000, // Every minute
      limit: 10080, // Max 1 week of checks
    },
  });
}

export async function addDecideVariantJob(data: Omit<DecideVariantJobData, "type">) {
  return await abTestQueue.add("decide-variant", { type: "decide-variant", ...data });
}

export async function addUpdateVariantStatsJob(data: Omit<UpdateVariantStatsJobData, "type">) {
  return await abTestQueue.add("update-variant-stats", { type: "update-variant-stats", ...data });
}
