/**
 * Resend Email Provider implementation.
 *
 * Uses the Resend API (npm: resend) to send emails and fetch replies.
 */

import { Resend } from "resend";
import type { EmailProvider, SendEmailParams, SendEmailResult, ReplyEmail } from "./base.js";

const RESEND_API_KEY = process.env.EMAIL_API_KEY || "";
const DEFAULT_FROM = process.env.EMAIL_FROM_ADDRESS || "noreply@genmail.app";
const DEFAULT_FROM_NAME = process.env.EMAIL_FROM_NAME || "GenMail";

export class ResendProvider implements EmailProvider {
  private client: Resend;

  constructor() {
    this.client = new Resend(RESEND_API_KEY);
  }

  async send(params: SendEmailParams): Promise<SendEmailResult> {
    try {
      const from = params.from
        ? `${params.fromName || DEFAULT_FROM_NAME} <${params.from}>`
        : `${DEFAULT_FROM_NAME} <${DEFAULT_FROM}>`;

      const resp = await this.client.emails.send({
        from,
        to: params.to,
        subject: params.subject,
        html: params.bodyHtml,
        text: params.bodyText,
        reply_to: params.replyTo,
        headers: params.headers,
      });

      if (resp.error) {
        return {
          success: false,
          error: resp.error.message || "Resend API error",
          bounceType: null,
        };
      }

      return {
        success: true,
        providerMessageId: resp.data?.id,
      };
    } catch (err: any) {
      return {
        success: false,
        error: err.message || "Unknown Resend error",
        bounceType: null,
      };
    }
  }

  async getReplies(since: Date): Promise<ReplyEmail[]> {
    // Resend does not have a native "get replies" endpoint.
    // This would typically be handled via webhooks.
    // For now, return empty array — replies come via handleWebhook.
    return [];
  }

  async handleWebhook(payload: unknown): Promise<ReplyEmail | null> {
    // Resend webhook payload parsing
    // In production, validate the webhook signature
    try {
      const data = payload as Record<string, any>;
      if (data?.type === "email.received") {
        return {
          from: data.email?.from || "",
          subject: data.email?.subject || "",
          bodyText: data.email?.body_plain || data.email?.body_html || "",
          receivedAt: new Date(data.email?.created_at || Date.now()),
          providerMessageId: data.email?.id || "",
          inReplyTo: data.email?.headers?.["In-Reply-To"],
        };
      }
      return null;
    } catch {
      return null;
    }
  }
}
