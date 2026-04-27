import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

/**
 * POST /api/onboarding
 * Persists business info from onboarding wizard and marks user as onboarded
 */
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.businessId || !session.user.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { businessName, sector, brandVoice, prohibitedClaims } = body;

    if (!businessName || !sector) {
      return NextResponse.json(
        { error: "Business name and sector are required" },
        { status: 400 }
      );
    }

    // Update business
    await db.business.update({
      where: { id: session.user.businessId },
      data: {
        name: businessName,
        sector,
        brandVoice: brandVoice || null,
        prohibitedClaims: Array.isArray(prohibitedClaims) ? prohibitedClaims : [],
      },
    });

    // Mark user as onboarded
    await db.user.update({
      where: { id: session.user.id },
      data: {
        onboardingCompleted: true,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("POST /api/onboarding error:", error);
    return NextResponse.json(
      { error: "Failed to complete onboarding" },
      { status: 500 }
    );
  }
}
