/**
 * Typed database query functions for common operations.
 */

import { query as _query, queryOne as _queryOne, execute as _execute } from "./client.js";

// Re-export with original names for external consumers
export const query = _query;
export const queryOne = _queryOne;
export const execute = _execute;

// ---------------------------------------------------------------------------
// Lead queries
// ---------------------------------------------------------------------------

export interface Lead {
  id: string;
  email: string;
  name?: string;
  zone?: string;
  source?: string;
  trigger?: string;
  icp_slug?: string;
  quality_score?: number;
  intent_score?: number;
  urgency?: string;
  status: string;
  raw_data?: any;
  created_at: Date;
  updated_at: Date;
}

export async function getLeadById(id: string): Promise<Lead | null> {
  return _queryOne("SELECT * FROM leads WHERE id = $1", [id]);
}

export async function updateLeadStatus(
  id: string,
  status: string,
  extraFields?: Record<string, any>
): Promise<void> {
  const sets: string[] = ["status = $2", "updated_at = NOW()"];
  const values: any[] = [id, status];
  let idx = 3;

  if (extraFields) {
    for (const [key, value] of Object.entries(extraFields)) {
      sets.push(`${key} = $${idx}`);
      values.push(value);
      idx++;
    }
  }

  await _execute(
    `UPDATE leads SET ${sets.join(", ")} WHERE id = $1`,
    values
  );
}

// ---------------------------------------------------------------------------
// ICP queries
// ---------------------------------------------------------------------------

export interface Icp {
  id: string;
  slug: string;
  name: string;
  priority: number;
  status: string;
  intent_keywords?: string[];
  zones?: string[];
  pain_points?: string[];
  triggers?: string[];
  primary_product?: string;
  secondary_products?: string[];
  entry_price?: string;
  tone?: string;
  framework?: string;
  cta_type?: string;
  hook_templates?: string[];
  hunt_sources?: any;
  hunt_queries?: string[];
  prohibited_terms?: string[];
  best_send_times?: string[];
}

export async function getIcpBySlug(slug: string): Promise<Icp | null> {
  return _queryOne("SELECT * FROM icps WHERE slug = $1", [slug]);
}

// ---------------------------------------------------------------------------
// Email sequence queries
// ---------------------------------------------------------------------------

export interface EmailSequence {
  id: string;
  lead_id: string;
  icp_slug?: string;
  sequence_name?: string;
  total_emails: number;
  current_step: number;
  status: string;
  created_at: Date;
  updated_at: Date;
}

export async function insertEmailSequence(seq: {
  lead_id: string;
  icp_slug?: string;
  sequence_name?: string;
  total_emails: number;
}): Promise<string> {
  const row = await _queryOne(
    `INSERT INTO email_sequences (lead_id, icp_slug, sequence_name, total_emails, status)
     VALUES ($1, $2, $3, $4, 'active')
     RETURNING id`,
    [seq.lead_id, seq.icp_slug || null, seq.sequence_name || null, seq.total_emails]
  );
  return row.id;
}

export async function updateSequenceStatus(
  id: string,
  status: string
): Promise<void> {
  await _execute(
    "UPDATE email_sequences SET status = $1, updated_at = NOW() WHERE id = $2",
    [status, id]
  );
}

export async function getActiveSequences(): Promise<EmailSequence[]> {
  return _query(
    "SELECT * FROM email_sequences WHERE status = 'active' ORDER BY created_at ASC"
  );
}

// ---------------------------------------------------------------------------
// Email log queries
// ---------------------------------------------------------------------------

export interface EmailLog {
  id: string;
  sequence_id?: string;
  lead_id?: string;
  step?: number;
  subject_line?: string;
  body_text?: string;
  sent_at?: Date;
  opened_at?: Date;
  replied_at?: Date;
  reply_text?: string;
  reply_intent?: string;
  bounce_type?: string;
  complaint?: boolean;
  score?: number;
  send_recommendation?: string;
  status?: string;
  scheduled_send_at?: Date;
  created_at: Date;
}

export async function insertEmailLog(log: {
  sequence_id?: string;
  lead_id?: string;
  step?: number;
  subject_line?: string;
  body_text?: string;
  score?: number;
  send_recommendation?: string;
  status?: string;
  scheduled_send_at?: Date;
}): Promise<string> {
  const row = await _queryOne(
    `INSERT INTO email_logs
       (sequence_id, lead_id, step, subject_line, body_text, score,
        send_recommendation, status, scheduled_send_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
     RETURNING id`,
    [
      log.sequence_id || null,
      log.lead_id || null,
      log.step || null,
      log.subject_line || null,
      log.body_text || null,
      log.score ?? null,
      log.send_recommendation || null,
      log.status || "pending",
      log.scheduled_send_at || null,
    ]
  );
  return row.id;
}

export async function getPendingEmails(limit = 50): Promise<EmailLog[]> {
  return _query(
    `SELECT * FROM email_logs
     WHERE status = 'pending'
       AND scheduled_send_at <= NOW()
     ORDER BY scheduled_send_at ASC
     LIMIT $1`,
    [limit]
  );
}

export async function updateEmailSent(
  id: string,
  status: string,
  extraFields?: Record<string, any>
): Promise<void> {
  const sets: string[] = [];
  const values: any[] = [];
  let idx = 1;

  if (status === "sent") {
    sets.push("sent_at = NOW()");
  }

  sets.push("status = $1");
  values.push(status);

  if (extraFields) {
    for (const [key, value] of Object.entries(extraFields)) {
      idx++;
      sets.push(`${key} = $${idx}`);
      values.push(value);
    }
  }

  values.push(id);
  await _execute(
    `UPDATE email_logs SET ${sets.join(", ")} WHERE id = $${idx + 1}`,
    values
  );
}

// ---------------------------------------------------------------------------
// Urgent notifications
// ---------------------------------------------------------------------------

export async function insertUrgentNotification(notif: {
  lead_id?: string;
  sequence_id?: string;
  reply_text?: string;
  reply_intent?: string;
  whatsapp_alert_text?: string;
}): Promise<string> {
  const row = await _queryOne(
    `INSERT INTO urgent_notifications
       (lead_id, sequence_id, reply_text, reply_intent, whatsapp_alert_text)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING id`,
    [
      notif.lead_id || null,
      notif.sequence_id || null,
      notif.reply_text || null,
      notif.reply_intent || null,
      notif.whatsapp_alert_text || null,
    ]
  );
  return row.id;
}
