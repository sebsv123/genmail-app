import { Queue } from "bullmq";
import { getRedisConnection } from "../connection.js";

export const SEQUENCE_PROCESSING_QUEUE = "sequence-processing";

export interface ProcessSequenceJobData {
  scheduled: boolean;
}

export const sequenceQueue = new Queue<ProcessSequenceJobData>(SEQUENCE_PROCESSING_QUEUE, {
  connection: getRedisConnection(),
  defaultJobOptions: {
    attempts: 2,
    backoff: {
      type: "fixed",
      delay: 5000,
    },
    removeOnComplete: { count: 50 },
    removeOnFail: { count: 20 },
  },
});

export async function addProcessSequenceJob(data: ProcessSequenceJobData): Promise<void> {
  await sequenceQueue.add("process-sequences", data);
}
