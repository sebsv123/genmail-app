import {
  registerSequenceScheduler,
  registerIngestionScheduler,
  registerLearningScheduler,
  registerSignalsScheduler,
  closeRedisConnection,
} from "@genmail/queue";
import { createSequenceWorker } from "./workers/sequence.worker.js";
import { createEmailWorker } from "./workers/email.worker.js";
import { createHuntWorker } from "./workers/hunt.worker.js";
import { ingestionWorker } from "./workers/ingestion.worker.js";
import { learningWorker } from "./workers/learning.worker.js";
import { abTestWorker } from "./workers/ab-test.worker.js";
import { createSignalsWorker } from "./workers/signals.worker.js";

// New workers
import {
  createLeadProcessingWorker,
  createEmailSendWorker,
  createReplyCheckWorker,
  createSequenceSchedulerWorker,
  closeAllQueues,
} from "./queues/index.js";
import { processLead } from "./workers/leadProcessingWorker.js";
import { sendPendingEmails } from "./workers/emailSendWorker.js";
import { checkReplies } from "./workers/replyCheckWorker.js";

const VERSION = "0.1.0";

console.log(`
╔════════════════════════════════════════════════════════╗
║                                                        ║
║   GenMail Worker v${VERSION}                            ║
║   Starting at ${new Date().toISOString()}              ║
║                                                        ║
╚════════════════════════════════════════════════════════╝
`);

// Start all workers
console.log("[Main] Starting workers...");

// Existing workers
const sequenceWorker = createSequenceWorker();
console.log("✓ Sequence worker started (concurrency: 1)");

const emailWorker = createEmailWorker();
console.log("✓ Email worker started (concurrency: 5)");

const huntWorker = createHuntWorker();
console.log("✓ Hunt worker started (concurrency: 2)");

console.log("✓ Ingestion worker started (concurrency: 2)");
console.log("✓ Learning worker started (concurrency: 1)");
console.log("✓ AB Test worker started (concurrency: 1)");

const signalsWorker = createSignalsWorker();
console.log("✓ Signals worker started (concurrency: 3)");

// New workers
const leadProcessingWorker = createLeadProcessingWorker(processLead, 2);
console.log("✓ Lead processing worker started (concurrency: 2)");

const emailSendBullWorker = createEmailSendWorker(async () => {
  await sendPendingEmails();
}, 1);
console.log("✓ Email send worker started (concurrency: 1)");

const replyCheckBullWorker = createReplyCheckWorker(async () => {
  await checkReplies();
}, 1);
console.log("✓ Reply check worker started (concurrency: 1)");

const sequenceSchedulerBullWorker = createSequenceSchedulerWorker(async () => {
  // Sequence scheduler logic — will be implemented in a future phase
  console.log("[SequenceScheduler] Checking active sequences...");
}, 1);
console.log("✓ Sequence scheduler worker started (concurrency: 1)");

// Register schedulers
registerSequenceScheduler().then(() => {
  console.log("✓ Sequence scheduler registered (every 5 minutes)");
}).catch((err: unknown) => {
  console.error("✗ Failed to register sequence scheduler:", err);
});

registerIngestionScheduler().then(() => {
  console.log("✓ Ingestion scheduler registered (RSS refresh every 6 hours)");
}).catch((err: unknown) => {
  console.error("✗ Failed to register ingestion scheduler:", err);
});

registerLearningScheduler().then(() => {
  console.log("✓ Learning scheduler registered");
}).catch((err: unknown) => {
  console.error("✗ Failed to register learning scheduler:", err);
});

registerSignalsScheduler().then(() => {
  console.log("✓ Signals scheduler registered (collect trends every 6 hours)");
}).catch((err: unknown) => {
  console.error("✗ Failed to register signals scheduler:", err);
});

// Graceful shutdown
async function gracefulShutdown(signal: string) {
  console.log(`\n[Main] Received ${signal}, starting graceful shutdown...`);

  // Close all workers
  await Promise.all([
    sequenceWorker.close(),
    emailWorker.close(),
    huntWorker.close(),
    ingestionWorker.close(),
    learningWorker.close(),
    abTestWorker.close(),
    signalsWorker.close(),
    leadProcessingWorker.close(),
    emailSendBullWorker.close(),
    replyCheckBullWorker.close(),
    sequenceSchedulerBullWorker.close(),
  ]);
  console.log("✓ All workers closed");

  // Close queues
  await closeAllQueues();
  console.log("✓ All queues closed");

  // Close Redis connection
  closeRedisConnection();
  console.log("✓ Redis connection closed");

  console.log("[Main] Graceful shutdown complete");
  process.exit(0);
}

process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
process.on("SIGINT", () => gracefulShutdown("SIGINT"));

console.log("\n[Main] All systems operational! Waiting for jobs...");

// Keep process alive
setInterval(() => {
  // Health check - could add more detailed checks here
  const memoryUsage = process.memoryUsage();
  if (memoryUsage.heapUsed > 500 * 1024 * 1024) {
    // 500MB
    console.warn(
      `[Main] High memory usage detected: ${Math.round(
        memoryUsage.heapUsed / 1024 / 1024
      )}MB`
    );
  }
}, 60000); // Check every minute
