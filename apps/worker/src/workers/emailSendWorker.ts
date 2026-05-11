/**
 * Email Send Worker.
 *
 * Cron cada 5 minutos:
 * - Lee de email_logs donde scheduled_send_at <= NOW() AND status = 'pending'
 * - Para cada email pendiente:
 *   Llama al email provider
 *   UPDATE email_logs SET status='sent', sent_at=NOW()
 *   Si bounce → UPDATE status='bounced', bounce_type
 *   Si error provider → retry hasta 3 veces con backoff, luego status='failed'
 * - Máx 50 emails por ciclo
 */

import { getEmailProvider } from "../providers/factory.js";
import { getPendingEmails, updateEmailSent } from "../db/queries.js";

const MAX_EMAILS_PER_CYCLE = 50;
const MAX_RETRIES = 3;

const emailProvider = getEmailProvider();

export async function sendPendingEmails(): Promise<void> {
  console.log("[EmailSend] Checking for pending emails...");

  try {
    const pendingEmails = await getPendingEmails(MAX_EMAILS_PER_CYCLE);
    console.log(`[EmailSend] Found ${pendingEmails.length} pending emails`);

    for (const emailLog of pendingEmails) {
      await sendSingleEmail(emailLog);
    }
  } catch (err: any) {
    console.error("[EmailSend] Error in send cycle:", err.message);
  }
}

async function sendSingleEmail(emailLog: any): Promise<void> {
  const { id, subject_line, body_text, lead_id } = emailLog;
  let lastError: string | undefined;

  // Get lead email from DB if needed
  let toEmail = "";
  try {
    const { queryOne } = await import("../db/queries.js");
    const lead = await queryOne("SELECT email FROM leads WHERE id = $1", [lead_id]);
    toEmail = lead?.email || "";
  } catch {
    toEmail = "";
  }

  if (!toEmail) {
    console.error(`[EmailSend] Email ${id}: no lead email found`);
    await updateEmailSent(id, "failed", { bounce_type: "no_recipient" });
    return;
  }

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      console.log(`[EmailSend] Sending email ${id} to ${toEmail} (attempt ${attempt}/${MAX_RETRIES})`);

      const result = await emailProvider.send({
        to: toEmail,
        subject: subject_line || "",
        bodyHtml: body_text || "",
        bodyText: body_text,
      });

      if (result.success) {
        await updateEmailSent(id, "sent", {
          provider_message_id: result.providerMessageId,
        });
        console.log(`[EmailSend] Email ${id} sent successfully`);
        return;
      }

      // Handle bounce
      if (result.bounceType) {
        await updateEmailSent(id, "bounced", {
          bounce_type: result.bounceType,
          error: result.error,
        });
        console.warn(`[EmailSend] Email ${id} bounced (${result.bounceType}): ${result.error}`);
        return;
      }

      // Transient error — retry
      lastError = result.error;
      console.warn(`[EmailSend] Email ${id} attempt ${attempt} failed: ${result.error}`);

      if (attempt < MAX_RETRIES) {
        // Exponential backoff: 5s, 10s, 15s
        await new Promise((resolve) => setTimeout(resolve, attempt * 5000));
      }
    } catch (err: any) {
      lastError = err.message;
      console.error(`[EmailSend] Email ${id} attempt ${attempt} exception: ${err.message}`);

      if (attempt < MAX_RETRIES) {
        await new Promise((resolve) => setTimeout(resolve, attempt * 5000));
      }
    }
  }

  // All retries exhausted
  console.error(`[EmailSend] Email ${id} failed after ${MAX_RETRIES} attempts`);
  await updateEmailSent(id, "failed", { error: lastError });
}
