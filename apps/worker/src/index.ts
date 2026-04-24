import { registerSequenceScheduler, registerIngestionScheduler, closeRedisConnection } from "@genmail/queue";
import { sequenceWorker } from "./workers/sequence.worker.js";
import { emailWorker } from "./workers/email.worker.js";
import { huntWorker } from "./workers/hunt.worker.js";
import { ingestionWorker } from "./workers/ingestion.worker.js";
import { abTestWorker } from "./workers/ab-test.worker.js";

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

console.log("✓ Sequence worker started (concurrency: 1)");
console.log("✓ Email worker started (concurrency: 5)");
console.log("✓ Hunt worker started (concurrency: 2)");
console.log("✓ Ingestion worker started (concurrency: 2)");
console.log("✓ Learning worker started (concurrency: 1)");
console.log("✓ AB Test worker started (concurrency: 1)");

// Register schedulers
registerSequenceScheduler().then(() => {
  console.log("✓ Sequence scheduler registered (every 5 minutes)");
}).catch((err) => {
  console.error("✗ Failed to register sequence scheduler:", err);
});

registerIngestionScheduler().then(() => {
  console.log("✓ Ingestion scheduler registered (RSS refresh every 6 hours)");
}).catch((err) => {
  console.error("✗ Failed to register ingestion scheduler:", err);
});

registerLearningScheduler().then(() => {
  console.log("✓ Learning scheduler registered");
}).catch((err) => {
  console.error("✗ Failed to register learning scheduler:", err);
});

// Graceful shutdown
async function gracefulShutdown(signal: string) {
  console.log(`\n[Main] Received ${signal}, starting graceful shutdown...`);

  // Close workers
  await Promise.all([
    sequenceWorker.close(),
    emailWorker.close(),
    huntWorker.close(),
    ingestionWorker.close(),
    learningWorker.close(),
    abTestWorker.close(),
  ]);
  console.log("✓ All workers closed");

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
