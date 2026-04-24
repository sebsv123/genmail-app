import { Queue } from "bullmq";
import { getRedisConnection } from "../connection.js";

export const LEAD_HUNTING_QUEUE = "lead-hunting";

export interface HuntProspectsJobData {
  icpId: string;
}

export interface SendColdEmailJobData {
  prospectId: string;
  stepNumber: number;
}

export const huntQueue = new Queue<HuntProspectsJobData | SendColdEmailJobData>(LEAD_HUNTING_QUEUE, {
  connection: getRedisConnection(),
  defaultJobOptions: {
    attempts: 2,
    backoff: {
      type: "fixed",
      delay: 10000,
    },
    removeOnComplete: { count: 100 },
    removeOnFail: { count: 50 },
  },
});

export async function addHuntProspectsJob(data: HuntProspectsJobData): Promise<void> {
  await huntQueue.add("hunt-prospects", data);
}

export async function addSendColdEmailJob(data: SendColdEmailJobData): Promise<void> {
  await huntQueue.add("send-cold-email", data);
}
