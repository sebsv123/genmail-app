/**
 * Email Provider Interface.
 *
 * Defines the contract that all email providers must implement.
 */

export interface SendEmailParams {
  to: string;
  subject: string;
  bodyHtml: string;
  bodyText?: string;
  from?: string;
  fromName?: string;
  replyTo?: string;
  headers?: Record<string, string>;
}

export interface SendEmailResult {
  success: boolean;
  providerMessageId?: string;
  error?: string;
  bounceType?: "hard" | "soft" | null;
}

export interface ReplyEmail {
  from: string;
  subject: string;
  bodyText: string;
  receivedAt: Date;
  providerMessageId: string;
  inReplyTo?: string;
}

export interface EmailProvider {
  /** Send a single email */
  send(params: SendEmailParams): Promise<SendEmailResult>;

  /** Fetch replies received since the given timestamp */
  getReplies(since: Date): Promise<ReplyEmail[]>;

  /** Handle an incoming webhook from the provider */
  handleWebhook(payload: unknown): Promise<ReplyEmail | null>;
}
