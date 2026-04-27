import { NextRequest } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { apiError, apiSuccess } from "@/lib/api";
import { addHuntProspectsJob } from "@genmail/queue";

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.businessId) return apiError("Unauthorized", 401);
  const { id } = await params;

  try {
    const icp = await db.iCP.findUnique({ where: { id } });
    if (!icp || icp.businessId !== session.user.businessId) return apiError("Not found", 404);
    if (!icp.isActive) return apiError("ICP is inactive", 400);

    await addHuntProspectsJob({ icpId: id });
    return apiSuccess({ queued: true, message: "Hunt job queued. Prospects will appear shortly." });
  } catch (e) {
    console.error("POST /api/icps/[id]/hunt", e);
    return apiError("Failed to queue hunt job", 500);
  }
}
