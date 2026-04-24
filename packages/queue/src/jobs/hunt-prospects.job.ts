/**
 * Job types for lead hunting worker
 */

export interface HuntProspectsJobPayload {
  icpId: string;
}

export interface SendColdEmailJobPayload {
  prospectId: string;
  stepNumber: number;
}
