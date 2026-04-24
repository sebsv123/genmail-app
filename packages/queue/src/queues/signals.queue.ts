/**
 * Signals Queue - FASE 18E
 * Cola para procesar señales externas y enriquecer scoring
 */

import { Queue, Job } from "bullmq";
import { Redis } from "ioredis";

export const SIGNALS_QUEUE = "signals";

// Job types
export interface CollectSectorTrendsJobData {
  type: "CollectSectorTrendsJob";
}

export interface EnrichProspectSignalsJobData {
  type: "EnrichProspectSignalsJob";
  prospectId: string;
}

export interface ProcessExternalSignalJobData {
  type: "ProcessExternalSignalJob";
  signalId: string;
}

export type SignalsJobData =
  | CollectSectorTrendsJobData
  | EnrichProspectSignalsJobData
  | ProcessExternalSignalJobData;

// Redis connection
const getRedisConnection = () => {
  const redis = new Redis(process.env.REDIS_URL || "redis://localhost:6379", {
    maxRetriesPerRequest: null,
  });
  return redis;
};

// Queue instance
export const signalsQueue = new Queue<SignalsJobData>(SIGNALS_QUEUE, {
  connection: getRedisConnection(),
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: "exponential",
      delay: 5000,
    },
  },
});

// Job adders
export async function addCollectSectorTrendsJob(): Promise<Job<CollectSectorTrendsJobData>> {
  return signalsQueue.add(
    "CollectSectorTrendsJob",
    { type: "CollectSectorTrendsJob" },
    {
      repeat: { every: 6 * 60 * 60 * 1000 }, // Cada 6 horas
      jobId: "collect-sector-trends-repeat",
    }
  );
}

export async function addEnrichProspectSignalsJob(
  prospectId: string
): Promise<Job<EnrichProspectSignalsJobData>> {
  return signalsQueue.add("EnrichProspectSignalsJob", {
    type: "EnrichProspectSignalsJob",
    prospectId,
  });
}

export async function addProcessExternalSignalJob(
  signalId: string
): Promise<Job<ProcessExternalSignalJobData>> {
  return signalsQueue.add("ProcessExternalSignalJob", {
    type: "ProcessExternalSignalJob",
    signalId,
  });
}
