import { NextRequest } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { apiError, apiSuccess } from "@/lib/api";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.businessId) return apiError("Unauthorized", 401);
  const { id } = await params;

  try {
    const existing = await db.iCP.findUnique({ where: { id } });
    if (!existing || existing.businessId !== session.user.businessId) return apiError("Not found", 404);
    const body = await req.json();
    const updated = await db.iCP.update({
      where: { id },
      data: {
        ...(typeof body.isActive === "boolean" && { isActive: body.isActive }),
        ...(body.sector && { sector: body.sector }),
        ...(body.targetRole && { targetRole: body.targetRole }),
      },
    });
    return apiSuccess(updated);
  } catch (e) {
    console.error("PATCH /api/icps/[id]", e);
    return apiError("Failed to update", 500);
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.businessId) return apiError("Unauthorized", 401);
  const { id } = await params;
  try {
    const existing = await db.iCP.findUnique({ where: { id } });
    if (!existing || existing.businessId !== session.user.businessId) return apiError("Not found", 404);
    await db.iCP.delete({ where: { id } });
    return apiSuccess({ deleted: true });
  } catch (e) {
    console.error("DELETE /api/icps/[id]", e);
    return apiError("Failed to delete", 500);
  }
}
