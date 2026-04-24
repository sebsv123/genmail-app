import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { createBillingPortalSession } from "@/lib/stripe";
import { db } from "@/lib/db";
import { apiError, apiSuccess } from "@/lib/api";

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.businessId) {
    return apiError("Unauthorized", 401);
  }

  try {
    // Get subscription with Stripe customer ID
    const subscription = await db.subscription.findUnique({
      where: { businessId: session.user.businessId },
    });

    if (!subscription?.stripeCustomerId) {
      return apiError("No active subscription found", 404);
    }

    const portalUrl = await createBillingPortalSession(
      subscription.stripeCustomerId,
      `${process.env.NEXTAUTH_URL}/billing`
    );

    return apiSuccess({ url: portalUrl });
  } catch (error) {
    console.error("POST /api/billing/portal error:", error);
    return apiError("Failed to create billing portal session", 500);
  }
}
