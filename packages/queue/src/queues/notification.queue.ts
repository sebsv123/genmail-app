import { Queue } from "bullmq";
import { redisConnection } from "../connection.js";

export const NOTIFICATION_QUEUE = "notification";

export interface SendNotificationJobData {
  type: "send-notification";
  userId?: string;
  businessId: string;
  title: string;
  body: string;
  actionUrl?: string;
  notificationType: "SYSTEM" | "ALERT" | "INFO";
}

export const notificationQueue = new Queue<SendNotificationJobData>(NOTIFICATION_QUEUE, {
  connection: redisConnection,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: "exponential",
      delay: 2000,
    },
    removeOnComplete: 100,
    removeOnFail: 50,
  },
});

export async function addNotificationJob(data: Omit<SendNotificationJobData, "type">) {
  return await notificationQueue.add("send-notification", {
    type: "send-notification",
    ...data,
  });
}
