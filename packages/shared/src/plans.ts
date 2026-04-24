/**
 * GenMail Subscription Plans & Limits
 * All prices in Euros (€), VAT not included
 */

export interface PlanLimits {
  leads: number;
  emailsPerMonth: number;
  sequences: number;
  businesses: number;
  leadHunterSearches: number;
  aiGenerations: number;
  teamMembers: number;
}

export interface Plan {
  name: string;
  price: number; // Monthly price in EUR
  stripePriceId: string | null;
  limits: PlanLimits;
  features: string[];
}

export const PLANS: Record<string, Plan> = {
  FREE: {
    name: "Free",
    price: 0,
    stripePriceId: null,
    limits: {
      leads: 50,
      emailsPerMonth: 200,
      sequences: 1,
      businesses: 1,
      leadHunterSearches: 0,
      aiGenerations: 20,
      teamMembers: 1,
    },
    features: [
      "50 leads",
      "200 emails/mes",
      "1 secuencia",
      "20 generaciones IA",
      "Soporte por email",
    ],
  },
  STARTER: {
    name: "Starter",
    price: 29, // €/mes
    stripePriceId: process.env.STRIPE_PRICE_STARTER || null,
    limits: {
      leads: 500,
      emailsPerMonth: 2000,
      sequences: 5,
      businesses: 1,
      leadHunterSearches: 10,
      aiGenerations: 200,
      teamMembers: 2,
    },
    features: [
      "500 leads",
      "2.000 emails/mes",
      "5 secuencias",
      "Lead Hunter (10 búsquedas/mes)",
      "200 generaciones IA",
      "2 usuarios",
      "Soporte prioritario",
    ],
  },
  PRO: {
    name: "Pro",
    price: 79, // €/mes
    stripePriceId: process.env.STRIPE_PRICE_PRO || null,
    limits: {
      leads: 5000,
      emailsPerMonth: 20000,
      sequences: 20,
      businesses: 3,
      leadHunterSearches: -1, // Unlimited
      aiGenerations: 2000,
      teamMembers: 5,
    },
    features: [
      "5.000 leads",
      "20.000 emails/mes",
      "20 secuencias",
      "Lead Hunter ilimitado",
      "2.000 generaciones IA",
      "3 negocios",
      "5 usuarios",
      "Analytics avanzados",
      "Soporte prioritario 24h",
    ],
  },
  AGENCY: {
    name: "Agency",
    price: 199, // €/mes
    stripePriceId: process.env.STRIPE_PRICE_AGENCY || null,
    limits: {
      leads: 50000,
      emailsPerMonth: 200000,
      sequences: -1, // Unlimited
      businesses: 20,
      leadHunterSearches: -1, // Unlimited
      aiGenerations: -1, // Unlimited
      teamMembers: 20,
    },
    features: [
      "50.000 leads",
      "200.000 emails/mes",
      "Secuencias ilimitadas",
      "Lead Hunter ilimitado",
      "IA ilimitada",
      "20 negocios",
      "20 usuarios",
      "White-label disponible",
      "Account manager dedicado",
      "SLA 99.9%",
    ],
  },
};

export type PlanKey = keyof typeof PLANS;

export function getPlanLimits(plan: PlanKey): PlanLimits {
  return PLANS[plan].limits;
}

export function isWithinLimits(
  plan: PlanKey,
  usage: Partial<PlanLimits>
): { allowed: boolean; exceeded: string[] } {
  const limits = PLANS[plan].limits;
  const exceeded: string[] = [];

  for (const [key, value] of Object.entries(usage)) {
    const limitKey = key as keyof PlanLimits;
    const limit = limits[limitKey];

    // -1 means unlimited
    if (limit === -1) continue;

    if (value !== undefined && value > limit) {
      exceeded.push(`${key}: ${value}/${limit}`);
    }
  }

  return {
    allowed: exceeded.length === 0,
    exceeded,
  };
}

export function getPlanPrice(plan: PlanKey, billingCycle: "monthly" | "yearly" = "monthly"): number {
  const basePrice = PLANS[plan].price;
  
  // 20% discount for yearly billing
  if (billingCycle === "yearly") {
    return Math.floor(basePrice * 0.8);
  }
  
  return basePrice;
}

export function getAnnualSavings(plan: PlanKey): number {
  const monthlyTotal = PLANS[plan].price * 12;
  const yearlyTotal = getPlanPrice(plan, "yearly") * 12;
  return monthlyTotal - yearlyTotal;
}
