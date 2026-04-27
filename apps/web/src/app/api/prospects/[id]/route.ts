import { NextRequest } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { apiError, apiSuccess } from "@/lib/api";
import { ProspectStatus } from "@genmail/db";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.businessId) return apiError("Unauthorized", 401);
  const { id } = await params;

  try {
    const prospect = await db.prospect.findUnique({
      where: { id },
      include: { icp: true },
    });
    if (!prospect || prospect.icp.businessId !== session.user.businessId) {
      return apiError("Not found", 404);
    }

    const body = await req.json();
    const allowed: ProspectStatus[] = ["FOUND", "VALIDATED", "APPROVED", "ENROLLED", "REPLIED", "BOUNCED", "UNSUBSCRIBED"] as any;
    if (body.status && !allowed.includes(body.status)) return apiError("Invalid status", 400);

    const data: any = {};
    if (body.status) data.status = body.status;
    if (body.status === "APPROVED") data.approvedAt = new Date();

    const updated = await db.prospect.update({ where: { id }, data });
    return apiSuccess(updated);
  } catch (e) {
    console.error("PATCH /api/prospects/[id]", e);
    return apiError("Failed to update prospect", 500);
  }
}
