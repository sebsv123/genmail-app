import { Queue, Job } from "bullmq";
import { redisConnection } from "../connection.js";

export const INGESTION_QUEUE = "ingestion";

export interface IngestSourceJobData {
  sourceId: string;
}

export interface IngestLeadJobData {
  leadId: string;
}

export interface RefreshRSSJobData {
  // No data needed - finds all RSS sources
}

/**
 * Queue for content ingestion jobs.
 * Handles embedding generation for knowledge sources and leads.
 */
export const ingestionQueue = new Queue<IngestSourceJobData | IngestLeadJobData | RefreshRSSJobData>(
  INGESTION_QUEUE,
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
 * Add a source ingestion job
 */
export async function addIngestSourceJob(sourceId: string): Promise<Job<IngestSourceJobData>> {
  return ingestionQueue.add(
    "ingest-source",
    { sourceId },
    {
      jobId: `ingest-source-${sourceId}`,
      removeOnComplete: 10,
      removeOnFail: 5,
    }
  );
}

/**
 * Add a lead ingestion job
 */
export async function addIngestLeadJob(leadId: string): Promise<Job<IngestLeadJobData>> {
  return ingestionQueue.add(
    "ingest-lead",
    { leadId },
    {
      jobId: `ingest-lead-${leadId}`,
      removeOnComplete: 10,
      removeOnFail: 5,
    }
  );
}

/**
 * Add a refresh RSS job (runs periodically to re-ingest RSS feeds)
 */
export async function addRefreshRSSJob(): Promise<Job<RefreshRSSJobData>> {
  return ingestionQueue.add(
    "refresh-rss",
    {},
    {
      jobId: "refresh-rss",
      removeOnComplete: 1,
      removeOnFail: 1,
    }
  );
}
