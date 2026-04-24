/**
 * GenMail Queue System
 * BullMQ-based job queues for email sending, sequence processing, and lead hunting
 */

// Connection
export {
  getRedisConnection,
  closeRedisConnection,
} from "./connection.js";

// Queues
export * from "./queues/index.js";

// Schedulers
export {
  registerSequenceScheduler,
  removeSequenceScheduler,
  getOptimalSendTime,
} from "./schedulers/sequence.scheduler.js";

// Version
export const VERSION = "0.1.0";
