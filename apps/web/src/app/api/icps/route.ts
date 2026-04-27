import { NextRequest } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { apiError, apiSuccess } from "@/lib/api";
import { z } from "zod";

const icpSchema = z.object({
  sector: z.string().min(1).max(255),
  targetRole: z.string().min(1).max(255),
  companySize: z.string().optional().nullable(),
  location: z.string().optional().nullable(),
  painPoints: z.array(z.string()).default([]),
  keywords: z.array(z.string()).default([]),
  isActive: z.boolean().optional(),
});

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.businessId) return apiError("Unauthorized", 401);

  try {
    const icps = await db.iCP.findMany({
      where: { businessId: session.user.businessId },
      orderBy: { createdAt: "desc" },
      include: {
        _count: { select: { prospects: true } },
      },
    });

    // Aggregate stats per ICP
    const icpsWithStats = await Promise.all(
      icps.map(async (icp) => {
        const stats = await db.prospect.groupBy({
          by: ["status"],
          where: { icpId: icp.id },
          _count: true,
        });
        const counts: Record<string, number> = {};
        for (const s of stats) counts[s.status] = s._count as number;
        return {
          ...icp,
          stats: {
            found: icp._count.prospects,
            validated: (counts.VALIDATED || 0) + (counts.APPROVED || 0) + (counts.ENROLLED || 0) + (counts.REPLIED || 0),
            approved: (counts.APPROVED || 0) + (counts.ENROLLED || 0) + (counts.REPLIED || 0),
            enrolled: (counts.ENROLLED || 0) + (counts.REPLIED || 0),
            replied: counts.REPLIED || 0,
          },
        };
      })
    );

    return apiSuccess({ icps: icpsWithStats });
  } catch (e) {
    console.error("GET /api/icps", e);
    return apiError("Failed to fetch ICPs", 500);
  }
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.businessId) return apiError("Unauthorized", 401);

  try {
    const body = await req.json();
    const data = icpSchema.parse(body);

    const icp = await db.iCP.create({
      data: {
        sector: data.sector,
        targetRole: data.targetRole,
        companySize: data.companySize || null,
        location: data.location || null,
        painPoints: data.painPoints,
        keywords: data.keywords,
        isActive: data.isActive ?? true,
        businessId: session.user.businessId,
      },
    });

    return apiSuccess(icp);
  } catch (e: any) {
    if (e?.name === "ZodError") return apiError(e.errors?.[0]?.message || "Invalid input", 400);
    console.error("POST /api/icps", e);
    return apiError("Failed to create ICP", 500);
  }
}
