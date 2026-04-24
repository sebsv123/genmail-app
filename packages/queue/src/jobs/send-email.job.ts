/**
 * Job types for email sending worker
 */

export interface SendEmailJobPayload {
  enrollmentId: string;
  attempt?: number;
}
