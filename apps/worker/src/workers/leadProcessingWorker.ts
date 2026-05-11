/**
 * Lead Processing Worker.
 *
 * Pipeline completo para un lead:
 * 1. Recibe job con {lead_id, email, name, zone, source, trigger, extra_data}
 * 2. UPDATE leads SET status='scoring'
 * 3. POST /score-lead → guarda quality_score + action
 * 4. Si quality_score < 40 → descartar
 * 5. POST /classify-lead → guarda icp_slug, confidence, intent_score
 * 6. Si icp_slug == 'descartado' → descartar
 * 7. POST /generate-valentin-sequence → guarda secuencia
 * 8. Para cada email: POST /evaluate-valentin-email, si score >= 70 → INSERT email_log
 * 9. UPDATE leads SET status='in_sequence'
 * 10. Error handling: cualquier fallo → status='error'
 */

import axios from "axios";
import type { Job } from "bullmq";
import {
  getLeadById,
  updateLeadStatus,
  insertEmailSequence,
  insertEmailLog,
  getIcpBySlug,
} from "../db/queries.js";

const AI_SERVICE_URL = process.env.AI_SERVICE_URL || "http://ai-service:8000";

interface LeadJobData {
  lead_id: string;
  email: string;
  name?: string;
  zone?: string;
  source?: string;
  trigger?: string;
  extra_data?: Record<string, any>;
}

export async function processLead(job: Job<LeadJobData>): Promise<void> {
  const { lead_id, email, name, zone, source, trigger, extra_data } = job.data;
  console.log(`[LeadProcessing] Processing lead ${lead_id} (${email})`);

  try {
    // Step 2: Mark as scoring
    await updateLeadStatus(lead_id, "scoring");
    console.log(`[LeadProcessing] Lead ${lead_id} → scoring`);

    // Step 3: POST /score-lead
    const scoreResp = await axios.post(`${AI_SERVICE_URL}/score-lead`, {
      name: name || "",
      email,
      zone: zone || "",
      source: source || "",
      trigger: trigger || "",
      ...(extra_data || {}),
    }, { timeout: 15000 });

    const { quality_score, action } = scoreResp.data;
    console.log(`[LeadProcessing] Lead ${lead_id} scored: ${quality_score}, action: ${action}`);

    // Step 4: Check quality score
    if (quality_score < 40) {
      await updateLeadStatus(lead_id, "discarded", {
        quality_score,
        raw_data: JSON.stringify({ reason: "low_quality_score", score: quality_score }),
      });
      console.log(`[LeadProcessing] Lead ${lead_id} discarded (score ${quality_score} < 40)`);
      return;
    }

    // Save quality score
    await updateLeadStatus(lead_id, "scoring", { quality_score });

    // Step 5: POST /classify-lead
    const classifyResp = await axios.post(`${AI_SERVICE_URL}/classify-lead`, {
      lead_data: { name, email, zone },
      source: source || "",
      trigger: trigger || "",
      zone: zone || "",
    }, { timeout: 15000 });

    const { icp_slug, confidence, intent_score, urgency } = classifyResp.data;
    console.log(`[LeadProcessing] Lead ${lead_id} classified: icp=${icp_slug}, confidence=${confidence}`);

    // Step 6: Check if discarded
    if (icp_slug === "descartado") {
      await updateLeadStatus(lead_id, "discarded", {
        icp_slug,
        quality_score,
        raw_data: JSON.stringify({ reason: "classified_as_discarded" }),
      });
      console.log(`[LeadProcessing] Lead ${lead_id} discarded (classified as descartado)`);
      return;
    }

    // Save classification
    await updateLeadStatus(lead_id, "scoring", {
      icp_slug,
      intent_score,
      urgency: urgency || "baja",
    });

    // Step 7: POST /generate-valentin-sequence
    const seqResp = await axios.post(`${AI_SERVICE_URL}/generate-valentin-sequence`, {
      first_name: name || "",
      zone: zone || "",
      icp_slug,
      primary_product: classifyResp.data.primary_product || "Seguro de Salud",
      trigger: trigger || "",
      urgency_level: urgency || "low",
    }, { timeout: 30000 });

    const { sequence_name, emails, best_send_times } = seqResp.data;
    console.log(`[LeadProcessing] Lead ${lead_id}: sequence "${sequence_name}" with ${emails?.length || 0} emails`);

    if (!emails || emails.length === 0) {
      await updateLeadStatus(lead_id, "error", {
        raw_data: JSON.stringify({ reason: "empty_sequence" }),
      });
      return;
    }

    // Insert sequence
    const sequenceId = await insertEmailSequence({
      lead_id,
      icp_slug,
      sequence_name: sequence_name || `Sequence for ${icp_slug}`,
      total_emails: emails.length,
    });

    // Get ICP for best send times
    const icp = await getIcpBySlug(icp_slug);
    const sendTimes = best_send_times || icp?.best_send_times || ["martes 10:00", "jueves 10:00"];

    // Step 8: Evaluate and queue each email
    for (let i = 0; i < emails.length; i++) {
      const emailData = emails[i];

      try {
        const evalResp = await axios.post(`${AI_SERVICE_URL}/evaluate-valentin-email`, {
          subject_line: emailData.subject_line || "",
          body_text: emailData.body_text || "",
          first_name: name || "",
          zone: zone || "",
          icp_slug,
          primary_product: classifyResp.data.primary_product || "Seguro de Salud",
          sequence_step: emailData.step || i + 1,
          framework_used: emailData.framework || "",
          cta_text: emailData.cta_text || "",
          cta_url: "https://wa.me/34603448765",
          word_count: emailData.word_count || 0,
        }, { timeout: 15000 });

        const { total_score, send_recommendation } = evalResp.data;
        console.log(`[LeadProcessing] Email ${i + 1}/${emails.length} scored: ${total_score}`);

        if (total_score >= 70) {
          // Calculate scheduled_send_at based on send_day
          const sendDay = emailData.send_day || i;
          const scheduledAt = new Date();
          scheduledAt.setDate(scheduledAt.getDate() + sendDay);
          scheduledAt.setHours(10, 0, 0, 0); // Default to 10:00

          await insertEmailLog({
            sequence_id: sequenceId,
            lead_id,
            step: i + 1,
            subject_line: emailData.subject_line,
            body_text: emailData.body_text,
            score: total_score,
            send_recommendation: send_recommendation || "send",
            status: "pending",
            scheduled_send_at: scheduledAt,
          });
        } else {
          // Log blocked email
          console.log(`[LeadProcessing] Email ${i + 1} blocked (score ${total_score} < 70)`);
          await insertEmailLog({
            sequence_id: sequenceId,
            lead_id,
            step: i + 1,
            subject_line: emailData.subject_line,
            body_text: emailData.body_text,
            score: total_score,
            send_recommendation: "blocked",
            status: "blocked",
          });
        }
      } catch (evalErr: any) {
        console.error(`[LeadProcessing] Email ${i + 1} evaluation failed:`, evalErr.message);
        // Continue with next email
      }
    }

    // Step 9: Mark as in_sequence
    await updateLeadStatus(lead_id, "in_sequence");
    console.log(`[LeadProcessing] Lead ${lead_id} → in_sequence`);

  } catch (err: any) {
    console.error(`[LeadProcessing] Lead ${lead_id} failed:`, err.message);
    // Step 10: Error handling
    try {
      await updateLeadStatus(lead_id, "error", {
        raw_data: JSON.stringify({ error: err.message, stack: err.stack }),
      });
    } catch (updateErr) {
      console.error(`[LeadProcessing] Failed to update lead ${lead_id} status:`, updateErr);
    }
    throw err; // Re-throw for BullMQ retry
  }
}
