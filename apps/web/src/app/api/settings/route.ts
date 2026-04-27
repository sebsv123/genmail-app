import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { apiError, apiSuccess } from "@/lib/api";
import { z } from "zod";

const settingsSchema = z.object({
  name: z.string().min(1).max(255),
  sector: z.string().min(1).max(100),
  brandVoice: z.string().optional().nullable(),
  prohibitedClaims: z.array(z.string()).default([]),
});

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.businessId) return apiError("Unauthorized", 401);

  try {
    const business = await db.business.findUnique({
      where: { id: session.user.businessId },
    });
    if (!business) return apiError("Business not found", 404);
    return apiSuccess({ business });
  } catch (e) {
    console.error("GET /api/settings", e);
    return apiError("Failed to fetch settings", 500);
  }
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.businessId) return apiError("Unauthorized", 401);

  try {
    const body = await req.json();
    const data = settingsSchema.parse(body);

    const business = await db.business.update({
      where: { id: session.user.businessId },
      data: {
        name: data.name,
        sector: data.sector,
        brandVoice: data.brandVoice,
        prohibitedClaims: data.prohibitedClaims,
      },
    });

    return apiSuccess({ business });
  } catch (e: any) {
    if (e?.name === "ZodError") return apiError(e.errors?.[0]?.message || "Invalid input", 400);
    console.error("POST /api/settings", e);
    return apiError("Failed to save settings", 500);
  }
}
