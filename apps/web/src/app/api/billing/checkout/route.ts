import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { createCheckoutSession } from "@/lib/stripe";
import { PLANS } from "@genmail/shared/plans";
import { apiError, apiSuccess } from "@/lib/api";

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.businessId) {
    return apiError("Unauthorized", 401);
  }

  try {
    const body = await req.json();
    const { plan } = body;

    if (!plan || !["STARTER", "PRO", "AGENCY"].includes(plan)) {
      return apiError("Invalid plan. Must be STARTER, PRO, or AGENCY", 400);
    }

    const priceId = PLANS[plan].stripePriceId;
    if (!priceId) {
      return apiError("Plan price ID not configured", 500);
    }

    const checkoutUrl = await createCheckoutSession({
      businessId: session.user.businessId,
      priceId,
      successUrl: `${process.env.NEXTAUTH_URL}/dashboard?upgraded=true`,
      cancelUrl: `${process.env.NEXTAUTH_URL}/pricing`,
    });

    return apiSuccess({ url: checkoutUrl });
  } catch (error) {
    console.error("POST /api/billing/checkout error:", error);
    return apiError("Failed to create checkout session", 500);
  }
}
