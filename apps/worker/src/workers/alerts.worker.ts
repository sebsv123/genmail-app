import { Worker, Job } from "bullmq";
import { db } from "@genmail/db";
import { redisConnection } from "@genmail/queue";
import { notificationQueue } from "@genmail/queue";

/**
 * ALERTS WORKER
 * Detects significant performance changes and creates smart notifications
 */

const ALERTS_QUEUE = "alerts";

export const alertsWorker = new Worker(
  ALERTS_QUEUE,
  async (job: Job) => {
    const { type, businessId } = job.data;
    console.log(`[Alerts Worker] Processing ${type} for business ${businessId}`);

    switch (type) {
      case "detect-anomaly":
        return await detectAnomaly(job.data);
      case "notify-milestone":
        return await notifyMilestone(job.data);
      case "check-health":
        return await checkHealth(job.data);
      default:
        console.warn(`[Alerts Worker] Unknown job type: ${type}`);
        return { error: "Unknown job type" };
    }
  },
  {
    connection: redisConnection,
    concurrency: 1,
    autorun: false,
  }
);

/**
 * Detect performance anomalies and notify business owners
 */
async function detectAnomaly(data: {
  businessId: string;
  metric: string;
  currentValue: number;
  threshold: number;
}): Promise<{ anomalyDetected: boolean; severity?: string }> {
  const { businessId, metric, currentValue, threshold } = data;

  // Calculate deviation
  const deviation = currentValue / threshold;
  const isSignificant = Math.abs(deviation - 1) > 0.2; // 20% threshold

  if (!isSignificant) {
    return { anomalyDetected: false };
  }

  // Determine severity
  let severity = "low";
  if (Math.abs(deviation - 1) > 0.4) severity = "high";
  else if (Math.abs(deviation - 1) > 0.3) severity = "medium";

  // Get business owner
  const owner = await db.user.findFirst({
    where: {
      businessId,
      role: "owner",
    },
  });

  if (!owner) {
    return { anomalyDetected: true, severity };
  }

  // Create notification
  const title = metric === "openRate" 
    ? "📉 Tu tasa de apertura bajó"
    : metric === "clickRate"
    ? "📉 Tu tasa de clicks disminuyó"
    : "📉 Rendimiento inusual detectado";

  const message = `Tu ${metric} es ${Math.round(deviation * 100)}% del promedio. Revisa tu estrategia.`;

  await db.notification.create({
    data: {
      userId: owner.id,
      businessId,
      type: "performance_alert",
      title,
      message,
      priority: severity,
      metadata: {
        metric,
        currentValue,
        threshold,
        deviation: Math.abs(deviation - 1),
      },
    },
  });

  return { anomalyDetected: true, severity };
}

/**
 * Notify when business reaches milestones
 */
async function notifyMilestone(data: {
  businessId: string;
  milestone: string;
  value: number;
}): Promise<{ notified: boolean }> {
  const { businessId, milestone, value } = data;

  const owner = await db.user.findFirst({
    where: { businessId, role: "owner" },
  });

  if (!owner) {
    return { notified: false };
  }

  let title = "";
  let message = "";

  switch (milestone) {
    case "100_emails":
      title = "🎉 ¡100 emails enviados!";
      message = "Tu negocio ha enviado 100 emails. Continúa así!";
      break;
    case "first_conversion":
      title = "🎉 ¡Primera conversión!";
      message = "Un lead ha respondido positivamente. Excelente trabajo!";
      break;
    case "pattern_confidence_high":
      title = "📊 Patrones de éxito identificados";
      message = "GenMail ha identificado patrones confiables en tus emails.";
      break;
    default:
      title = "🎉 Nuevo hito alcanzado";
      message = `Has alcanzado: ${milestone}`;
  }

  await db.notification.create({
    data: {
      userId: owner.id,
      businessId,
      type: "milestone",
      title,
      message,
      priority: "medium",
      metadata: { milestone, value },
    },
  });

  return { notified: true };
}

/**
 * Check overall system health and notify about issues
 */
async function checkHealth(data: {
  businessId: string;
}): Promise<{ issues: string[] }> {
  const { businessId } = data;
  const issues: string[] = [];

  // Check for stuck emails
  const stuckEmails = await db.learningEvent.count({
    where: {
      businessId,
      eventType: "EMAIL_SENT",
      processed: false,
      createdAt: { lt: new Date(Date.now() - 24 * 60 * 60 * 1000) },
    },
  });

  if (stuckEmails > 5) {
    issues.push("emails_stuck");

    const owner = await db.user.findFirst({
      where: { businessId, role: "owner" },
    });

    if (owner) {
      await db.notification.create({
        data: {
          userId: owner.id,
          businessId,
          type: "system_alert",
          title: "⚠️ Emails atascados",
          message: `${stuckEmails} emails no se procesaron correctamente. El equipo ha sido notificado.`,
          priority: "high",
          metadata: { stuckEmails },
        },
      });
    }
  }

  return { issues };
}
