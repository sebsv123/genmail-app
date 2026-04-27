import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { apiError, apiSuccess } from "@/lib/api";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.businessId) {
    return apiError("Unauthorized", 401);
  }

  try {
    const sequences = await db.sequence.findMany({
      where: {
        businessId: session.user.businessId,
      },
      orderBy: { createdAt: "desc" },
      include: {
        _count: {
          select: { enrollments: true },
        },
        templates: true,
      },
    });

    return apiSuccess(sequences);
  } catch (error) {
    console.error("GET /api/sequences error:", error);
    return apiError("Failed to fetch sequences", 500);
  }
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.businessId) {
    return apiError("Unauthorized", 401);
  }

  try {
    const body = await req.json();
    const { name, mode, goal } = body;

    if (!name || !mode) {
      return apiError("Name and mode are required", 400);
    }

    const sequence = await db.sequence.create({
      data: {
        name,
        mode,
        goal,
        status: "DRAFT",
        businessId: session.user.businessId,
      },
    });

    return apiSuccess(sequence);
  } catch (error) {
    console.error("POST /api/sequences error:", error);
    return apiError("Failed to create sequence", 500);
  }
}
