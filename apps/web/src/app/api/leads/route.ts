import { NextRequest } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { apiError, apiSuccess } from "@/lib/api";
import { LeadStage } from "@genmail/db";
import { z } from "zod";

const leadSchema = z.object({
  email: z.string().email(),
  name: z.string().min(1).max(255),
  phone: z.string().optional(),
  stage: z.nativeEnum(LeadStage).optional(),
  intentScore: z.number().min(0).max(1).optional(),
  contextData: z.record(z.any()).optional(),
});

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.businessId) return apiError("Unauthorized", 401);

  const { searchParams } = new URL(req.url);
  const stage = searchParams.get("stage");
  const page = Math.max(1, parseInt(searchParams.get("page") || "1"));
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "20")));
  const skip = (page - 1) * limit;

  try {
    const where = {
      businessId: session.user.businessId,
      ...(stage && stage !== "ALL" && { stage: stage as LeadStage }),
    };

    const [leads, total] = await Promise.all([
      db.lead.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
      }),
      db.lead.count({ where }),
    ]);

    return apiSuccess({ leads, total, page, limit });
  } catch (e) {
    console.error("GET /api/leads", e);
    return apiError("Failed to fetch leads", 500);
  }
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.businessId) return apiError("Unauthorized", 401);

  try {
    const body = await req.json();
    const data = leadSchema.parse(body);

    const lead = await db.lead.create({
      data: {
        ...data,
        businessId: session.user.businessId,
      },
    });

    return apiSuccess(lead);
  } catch (e: any) {
    if (e?.code === "P2002") return apiError("A lead with this email already exists", 409);
    if (e?.name === "ZodError") return apiError(e.errors?.[0]?.message || "Invalid input", 400);
    console.error("POST /api/leads", e);
    return apiError("Failed to create lead", 500);
  }
}
