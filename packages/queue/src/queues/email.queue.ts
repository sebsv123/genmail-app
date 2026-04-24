import { Queue } from "bullmq";
import { getRedisConnection } from "../connection.js";

export const EMAIL_SENDING_QUEUE = "email-sending";

export interface SendEmailJobData {
  enrollmentId: string;
  attempt?: number;
}

export const emailQueue = new Queue<SendEmailJobData>(EMAIL_SENDING_QUEUE, {
  connection: getRedisConnection(),
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: "exponential",
      delay: 1000,
    },
    removeOnComplete: { count: 100 },
    removeOnFail: { count: 50 },
  },
});

export async function addSendEmailJob(data: SendEmailJobData): Promise<void> {
  await emailQueue.add("send-email", data);
}
