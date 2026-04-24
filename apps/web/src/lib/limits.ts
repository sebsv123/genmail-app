import { db } from "./db";
import { PLANS, PlanLimits } from "@genmail/shared/plans";

export interface LimitCheckResult {
  allowed: boolean;
  current: number;
  max: number;
  limitType: keyof PlanLimits;
  upgradeUrl: string;
}

export type LimitType = keyof PlanLimits;

/**
 * Check if business is within limits for a specific feature
 */
export async function checkLimit(
  businessId: string,
  limitType: LimitType
): Promise<LimitCheckResult> {
  // Get subscription to determine plan
  const subscription = await db.subscription.findUnique({
    where: { businessId },
  });

  const plan = subscription?.plan || "FREE";
  const limits = PLANS[plan].limits;
  const max = limits[limitType];

  // -1 means unlimited
  if (max === -1) {
    return {
      allowed: true,
      current: 0,
      max: -1,
      limitType,
      upgradeUrl: "/pricing",
    };
  }

  // Get current usage
  const now = new Date();
  const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

  const usage = await db.usageRecord.upsert({
    where: {
      businessId_month: {
        businessId,
        month,
      },
    },
    create: {
      businessId,
      month,
      emailsSent: 0,
      leadsHunted: 0,
      activeLeads: 0,
    },
    update: {},
  });

  // Map limit types to usage fields
  const usageMap: Record<LimitType, number> = {
    leads: await db.lead.count({ where: { businessId } }),
    emailsPerMonth: usage.emailsSent,
    sequences: await db.sequence.count({ where: { businessId } }),
    businesses: 1, // Always 1 for now
    leadHunterSearches: usage.leadsHunted,
    aiGenerations: usage.emailsSent, // Using emailsSent as proxy for AI generations
    teamMembers: await db.user.count({ where: { businessId } }),
  };

  const current = usageMap[limitType];

  return {
    allowed: current < max,
    current,
    max,
    limitType,
    upgradeUrl: "/pricing",
  };
}

/**
 * Increment usage counter
 */
export async function incrementUsage(
  businessId: string,
  field: "emailsSent" | "leadsHunted" | "activeLeads",
  amount = 1
): Promise<void> {
  const now = new Date();
  const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

  await db.usageRecord.upsert({
    where: {
      businessId_month: {
        businessId,
        month,
      },
    },
    create: {
      businessId,
      month,
      [field]: amount,
    } as any,
    update: {
      [field]: { increment: amount },
    } as any,
  });
}

/**
 * Check limit and return formatted error if exceeded
 */
export async function checkLimitOrThrow(
  businessId: string,
  limitType: LimitType
): Promise<void> {
  const result = await checkLimit(businessId, limitType);

  if (!result.allowed) {
    throw new LimitExceededError(result);
  }
}

export class LimitExceededError extends Error {
  public readonly result: LimitCheckResult;

  constructor(result: LimitCheckResult) {
    super(
      `Has alcanzado el límite de ${result.limitType}: ${result.current}/${result.max}`
    );
    this.result = result;
    this.name = "LimitExceededError";
  }

  toJSON() {
    return {
      error: "Has alcanzado el límite de tu plan",
      limitType: this.result.limitType,
      current: this.result.current,
      max: this.result.max,
      upgradeUrl: this.result.upgradeUrl,
    };
  }
}
