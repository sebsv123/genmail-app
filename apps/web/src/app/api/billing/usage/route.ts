import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { PLANS, getPlanLimits } from "@genmail/shared/plans";
import { apiError, apiSuccess } from "@/lib/api";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.businessId) {
    return apiError("Unauthorized", 401);
  }

  try {
    // Get current month
    const now = new Date();
    const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

    // Get subscription to determine plan
    const subscription = await db.subscription.findUnique({
      where: { businessId: session.user.businessId },
    });

    const plan = subscription?.plan || "FREE";
    const limits = getPlanLimits(plan);

    // Get or create usage record
    const usage = await db.usageRecord.upsert({
      where: {
        businessId_month: {
          businessId: session.user.businessId,
          month,
        },
      },
      create: {
        businessId: session.user.businessId,
        month,
        emailsSent: 0,
        leadsHunted: 0,
        activeLeads: 0,
      },
      update: {},
    });

    return apiSuccess({
      plan,
      month,
      usage: {
        emailsSent: usage.emailsSent,
        leadsHunted: usage.leadsHunted,
        activeLeads: usage.activeLeads,
      },
      limits,
      remaining: {
        emails: limits.emailsPerMonth === -1 ? -1 : Math.max(0, limits.emailsPerMonth - usage.emailsSent),
        leads: limits.leads === -1 ? -1 : Math.max(0, limits.leads - usage.activeLeads),
        sequences: limits.sequences,
      },
    });
  } catch (error) {
    console.error("GET /api/billing/usage error:", error);
    return apiError("Failed to fetch usage data", 500);
  }
}
