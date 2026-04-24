import { Worker } from "bullmq";
import {
  SEQUENCE_PROCESSING_QUEUE,
  EMAIL_SENDING_QUEUE,
  type ProcessSequenceJobData,
  getRedisConnection,
  addSendEmailJob,
} from "@genmail/queue";
import { db } from "../lib/db.js";

export function createSequenceWorker(): Worker {
  const worker = new Worker<ProcessSequenceJobData>(
    SEQUENCE_PROCESSING_QUEUE,
    async (job) => {
      console.log(`[Sequence Worker] Processing job ${job.id} at ${new Date().toISOString()}`);

      // Find all active enrollments
      const enrollments = await db.sequenceEnrollment.findMany({
        where: { status: "ACTIVE" },
        include: {
          sequence: true,
          lead: {
            include: {
              leadMemory: true,
            },
          },
        },
      });

      console.log(`[Sequence Worker] Found ${enrollments.length} active enrollments`);

      let queued = 0;

      for (const enrollment of enrollments) {
        try {
          // Get templates for this sequence
          const templates = await db.emailTemplate.findMany({
            where: { sequenceId: enrollment.sequenceId },
            orderBy: { stepNumber: "asc" },
          });

          if (templates.length === 0) {
            console.log(`[Sequence Worker] No templates for sequence ${enrollment.sequenceId}`);
            continue;
          }

          // Check if there's a template for the current step
          const template = templates.find((t) => t.stepNumber === enrollment.currentStep);
          if (!template) {
            // If no template for current step, check if we should cycle (EVERGREEN) or stop
            if (enrollment.sequence.mode === "EVERGREEN") {
              // Reset to step 1 for evergreen
              await db.sequenceEnrollment.update({
                where: { id: enrollment.id },
                data: { currentStep: 1 },
              });
              console.log(`[Sequence Worker] Reset enrollment ${enrollment.id} to step 1 (evergreen)`);
            } else if (enrollment.sequence.mode === "NURTURING_INFINITE") {
              // For nurturing, we'll generate contextual email without template
              await queueEmailJob(enrollment.id);
              queued++;
            } else {
              // COMPLETED - all steps done
              await db.sequenceEnrollment.update({
                where: { id: enrollment.id },
                data: { status: "COMPLETED" },
              });
              console.log(`[Sequence Worker] Enrollment ${enrollment.id} completed`);
            }
            continue;
          }

          // Check if it's time to send (based on delayDays from template)
          const daysSinceEnrolled = Math.floor(
            (Date.now() - enrollment.enrolledAt.getTime()) / (1000 * 60 * 60 * 24)
          );
          const daysSinceLastStep = enrollment.lastEmailSentAt
            ? Math.floor(
                (Date.now() - enrollment.lastEmailSentAt.getTime()) / (1000 * 60 * 60 * 24)
              )
            : daysSinceEnrolled;

          // Simple logic: send every 3 days per step (configurable)
          const delayDays = template.delayDays || 3;
          
          if (daysSinceLastStep >= delayDays) {
            // Time to send - queue email job
            await queueEmailJob(enrollment.id);
            queued++;
          }
        } catch (error) {
          console.error(`[Sequence Worker] Error processing enrollment ${enrollment.id}:`, error);
        }
      }

      console.log(`[Sequence Worker] Queued ${queued} emails for sending`);
      return { processed: enrollments.length, queued };
    },
    {
      connection: getRedisConnection(),
      concurrency: 1,
    }
  );

  worker.on("completed", (job, result) => {
    console.log(`[Sequence Worker] Job ${job.id} completed:`, result);
  });

  worker.on("failed", (job, err) => {
    console.error(`[Sequence Worker] Job ${job?.id} failed:`, err);
  });

  return worker;
}

async function queueEmailJob(enrollmentId: string): Promise<void> {
  await addSendEmailJob({ enrollmentId });
  console.log(`[Sequence Worker] Queued email for enrollment ${enrollmentId}`);
}
