/**
 * Reply Check Worker.
 *
 * Cron cada 2 minutos:
 * - Lee replies del proveedor email desde last_check timestamp
 * - Para cada reply:
 *   POST /classify-valentin-reply
 *   UPDATE email_logs SET replied_at, reply_text, reply_intent
 *   Si stop_sequence=true → UPDATE email_sequences SET status='stopped'
 *   Si intent='positive' → INSERT en urgent_notifications
 */

import axios from "axios";
import { getEmailProvider } from "../providers/factory.js";
import { query, queryOne, updateEmailSent, updateSequenceStatus, insertUrgentNotification } from "../db/queries.js";

const AI_SERVICE_URL = process.env.AI_SERVICE_URL || "http://ai-service:8000";

// In-memory last check timestamp (in production, store in Redis/DB)
let lastCheckTimestamp: Date = new Date(Date.now() - 24 * 60 * 60 * 1000); // Start 24h ago

const emailProvider = getEmailProvider();

export async function checkReplies(): Promise<void> {
  console.log("[ReplyCheck] Checking for new replies...");

  try {
    const replies = await emailProvider.getReplies(lastCheckTimestamp);
    console.log(`[ReplyCheck] Found ${replies.length} new replies`);

    for (const reply of replies) {
      await processReply(reply);
    }

    lastCheckTimestamp = new Date();
  } catch (err: any) {
    console.error("[ReplyCheck] Error checking replies:", err.message);
  }
}

async function processReply(reply: {
  from: string;
  subject: string;
  bodyText: string;
  receivedAt: Date;
  providerMessageId: string;
  inReplyTo?: string;
}): Promise<void> {
  console.log(`[ReplyCheck] Processing reply from ${reply.from}: "${reply.subject}"`);

  try {
    // Find the original email log by provider message ID or subject
    let emailLog = await queryOne(
      "SELECT * FROM email_logs WHERE provider_message_id = $1",
      [reply.inReplyTo]
    );

    if (!emailLog) {
      // Try to find by subject match
      emailLog = await queryOne(
        "SELECT * FROM email_logs WHERE subject_line = $1 ORDER BY sent_at DESC LIMIT 1",
        [reply.subject]
      );
    }

    if (!emailLog) {
      console.log(`[ReplyCheck] No matching email log found for reply from ${reply.from}`);
      return;
    }

    // Get lead info for classification
    const lead = await queryOne("SELECT name, icp_slug FROM leads WHERE id = $1", [emailLog.lead_id]);

    // POST /classify-valentin-reply
    const classifyResp = await axios.post(`${AI_SERVICE_URL}/classify-valentin-reply`, {
      lead_name: lead?.name || "",
      icp_slug: lead?.icp_slug || "",
      sent_subject: emailLog.subject_line || "",
      reply_text: reply.bodyText,
      language: "es",
    }, { timeout: 15000 });

    const { reply_intent, stop_sequence, confidence, whatsapp_alert_text } = classifyResp.data;
    console.log(`[ReplyCheck] Reply classified: intent=${reply_intent}, stop=${stop_sequence}, confidence=${confidence}`);

    // UPDATE email_logs
    await updateEmailSent(emailLog.id, "replied", {
      replied_at: reply.receivedAt,
      reply_text: reply.bodyText,
      reply_intent: reply_intent || "unknown",
    });

    // If stop_sequence → pause the sequence
    if (stop_sequence && emailLog.sequence_id) {
      await updateSequenceStatus(emailLog.sequence_id, "stopped");
      console.log(`[ReplyCheck] Sequence ${emailLog.sequence_id} stopped due to reply intent: ${reply_intent}`);
    }

    // If positive intent → create urgent notification
    if (reply_intent === "positive" || reply_intent === "interested") {
      await insertUrgentNotification({
        lead_id: emailLog.lead_id,
        sequence_id: emailLog.sequence_id,
        reply_text: reply.bodyText,
        reply_intent,
        whatsapp_alert_text: whatsapp_alert_text || `🔔 Respuesta positiva de ${lead?.name || "desconocido"}: "${reply.bodyText.substring(0, 100)}"`,
      });
      console.log(`[ReplyCheck] Urgent notification created for lead ${emailLog.lead_id}`);
    }

  } catch (err: any) {
    console.error(`[ReplyCheck] Error processing reply from ${reply.from}:`, err.message);
  }
}
