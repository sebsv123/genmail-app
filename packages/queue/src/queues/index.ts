// Queues
export {
  emailQueue,
  EMAIL_SENDING_QUEUE,
  type SendEmailJobData,
  addSendEmailJob,
} from "./email.queue.js";

export {
  sequenceQueue,
  SEQUENCE_PROCESSING_QUEUE,
  type ProcessSequenceJobData,
  addProcessSequenceJob,
} from "./sequence.queue.js";

export {
  huntQueue,
  LEAD_HUNTING_QUEUE,
  type HuntProspectsJobData,
  type SendColdEmailJobData,
  addHuntProspectsJob,
  addSendColdEmailJob,
} from "./hunt.queue.js";

export {
  ingestionQueue,
  INGESTION_QUEUE,
  type IngestSourceJobData,
  type IngestLeadJobData,
  type RefreshRSSJobData,
  addIngestSourceJob,
  addIngestLeadJob,
  addRefreshRSSJob,
} from "./ingestion.queue.js";

export {
  learningQueue,
  LEARNING_QUEUE,
  type ProcessLearningEventJobData,
  type UpdateBestPracticesJobData,
  addProcessLearningEventJob,
  addUpdateBestPracticesJob,
} from "./learning.queue.js";

export {
  abTestQueue,
  AB_TEST_QUEUE,
  type CreateABTestJobData,
  type EvaluateABTestJobData,
  type DecideVariantJobData,
  type UpdateVariantStatsJobData,
  addCreateABTestJob,
  addEvaluateABTestJob,
  addDecideVariantJob,
  addUpdateVariantStatsJob,
} from "./ab-test.queue.js";
