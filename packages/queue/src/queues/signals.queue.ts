/**
 * Signals Queue - FASE 18E
 * Cola para procesar señales externas y enriquecer scoring
 */

import { Queue, Job } from "bullmq";
import { getRedisConnection } from "../connection.js";

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
export async function addCollectSectorTrendsJob(): Promise<Job<SignalsJobData>> {
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
): Promise<Job<SignalsJobData>> {
  return signalsQueue.add("EnrichProspectSignalsJob", {
    type: "EnrichProspectSignalsJob",
    prospectId,
  });
}

export async function addProcessExternalSignalJob(
  signalId: string
): Promise<Job<SignalsJobData>> {
  return signalsQueue.add("ProcessExternalSignalJob", {
    type: "ProcessExternalSignalJob",
    signalId,
  });
}
