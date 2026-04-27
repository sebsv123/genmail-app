import { NextRequest } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { apiError, apiSuccess } from "@/lib/api";
import { ProspectStatus } from "@genmail/db";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.businessId) return apiError("Unauthorized", 401);
  const { id } = await params;

  try {
    const icp = await db.iCP.findUnique({ where: { id } });
    if (!icp || icp.businessId !== session.user.businessId) return apiError("Not found", 404);

    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status");

    const prospects = await db.prospect.findMany({
      where: {
        icpId: id,
        ...(status && status !== "ALL" && { status: status as ProspectStatus }),
      },
      orderBy: { createdAt: "desc" },
      take: 200,
    });

    return apiSuccess({ prospects });
  } catch (e) {
    console.error("GET /api/icps/[id]/prospects", e);
    return apiError("Failed to fetch prospects", 500);
  }
}
