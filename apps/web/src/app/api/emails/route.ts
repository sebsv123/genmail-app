import { NextRequest } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { apiError, apiSuccess } from "@/lib/api";
import { GeneratedEmailStatus } from "@genmail/db";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.businessId) return apiError("Unauthorized", 401);

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status");
  const limit = Math.min(100, parseInt(searchParams.get("limit") || "20"));

  try {
    const emails = await db.generatedEmail.findMany({
      where: {
        businessId: session.user.businessId,
        ...(status && status !== "ALL" && { status: status as GeneratedEmailStatus }),
      },
      orderBy: { createdAt: "desc" },
      take: limit,
      include: {
        lead: { select: { id: true, name: true, email: true } },
      },
    });

    return apiSuccess({ emails });
  } catch (e) {
    console.error("GET /api/emails", e);
    return apiError("Failed to fetch emails", 500);
  }
}
