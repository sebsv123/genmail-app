import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { apiError, apiSuccess } from "@/lib/api";
import { LeadStage } from "@genmail/db";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.businessId) {
    return apiError("Unauthorized", 401);
  }

  const { searchParams } = new URL(req.url);
  const stage = searchParams.get("stage");
  const page = Math.max(1, parseInt(searchParams.get("page") || "1"));
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "20")));
  const skip = (page - 1) * limit;

  try {
    const where = {
      businessId: session.user.businessId,
      ...(stage && { stage: stage as LeadStage }),
    };

    const [leads, total] = await Promise.all([
      db.lead.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
        include: {
          memory: true,
          _count: {
            select: { generatedEmails: true },
          },
        },
      }),
      db.lead.count({ where }),
    ]);

    return apiSuccess({
      leads,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    console.error("GET /api/leads error:", error);
    return apiError("Failed to fetch leads", 500);
  }
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.businessId) {
    return apiError("Unauthorized", 401);
  }

  try {
    const body = await req.json();
    const { email, name, phone, contextData, stage } = body;

    if (!email || !name) {
      return apiError("Email and name are required", 400);
    }

    const lead = await db.lead.create({
      data: {
        email,
        name,
        phone,
        contextData: contextData || {},
        stage: stage || "NEW",
        businessId: session.user.businessId,
        memory: {
          create: {
            topicsUsed: [],
            hooksUsed: [],
            ctasUsed: [],
            claimsMade: [],
          },
        },
      },
      include: {
        memory: true,
      },
    });

    return apiSuccess(lead);
  } catch (error) {
    console.error("POST /api/leads error:", error);
    return apiError("Failed to create lead", 500);
  }
}
