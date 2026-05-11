/**
 * Queue definitions for GenMail Worker.
 *
 * Defines BullMQ queues used by the new workers:
 * - lead-processing: processes a new lead end-to-end
 * - email-send: sends queued emails
 * - reply-check: scans replies from email provider
 * - sequence-scheduler: schedules next email for active sequences
 */

import { Queue, Worker } from "bullmq";

const REDIS_URL = process.env.REDIS_URL || "redis://localhost:6379/0";

const connection = {
  url: REDIS_URL,
};

// ---------------------------------------------------------------------------
// Queue definitions
// ---------------------------------------------------------------------------

export const leadProcessingQueue = new Queue("lead-processing", { connection });
export const emailSendQueue = new Queue("email-send", { connection });
export const replyCheckQueue = new Queue("reply-check", { connection });
export const sequenceSchedulerQueue = new Queue("sequence-scheduler", { connection });

// ---------------------------------------------------------------------------
// Worker creation helpers
// ---------------------------------------------------------------------------

export function createLeadProcessingWorker(
  processor: (job: any) => Promise<void>,
  concurrency = 2
): Worker {
  return new Worker("lead-processing", processor, { connection, concurrency });
}

export function createEmailSendWorker(
  processor: (job: any) => Promise<void>,
  concurrency = 5
): Worker {
  return new Worker("email-send", processor, { connection, concurrency });
}

export function createReplyCheckWorker(
  processor: (job: any) => Promise<void>,
  concurrency = 1
): Worker {
  return new Worker("reply-check", processor, { connection, concurrency });
}

export function createSequenceSchedulerWorker(
  processor: (job: any) => Promise<void>,
  concurrency = 1
): Worker {
  return new Worker("sequence-scheduler", processor, { connection, concurrency });
}

// ---------------------------------------------------------------------------
// Close all queues
// ---------------------------------------------------------------------------

export async function closeAllQueues(): Promise<void> {
  await Promise.all([
    leadProcessingQueue.close(),
    emailSendQueue.close(),
    replyCheckQueue.close(),
    sequenceSchedulerQueue.close(),
  ]);
}
