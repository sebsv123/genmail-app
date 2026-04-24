import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { apiError, apiSuccess } from "@/lib/api";

interface RouteParams {
  params: { id: string };
}

export async function GET(req: NextRequest, { params }: RouteParams) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.businessId) {
    return apiError("Unauthorized", 401);
  }

  try {
    const sequence = await db.sequence.findFirst({
      where: {
        id: params.id,
        businessId: session.user.businessId,
      },
      include: {
        emailTemplates: {
          orderBy: { stepNumber: "asc" },
        },
        enrollments: {
          include: {
            lead: true,
          },
        },
      },
    });

    if (!sequence) {
      return apiError("Sequence not found", 404);
    }

    return apiSuccess(sequence);
  } catch (error) {
    console.error(`GET /api/sequences/${params.id} error:`, error);
    return apiError("Failed to fetch sequence", 500);
  }
}

export async function PATCH(req: NextRequest, { params }: RouteParams) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.businessId) {
    return apiError("Unauthorized", 401);
  }

  try {
    const body = await req.json();
    const { name, status, goal } = body;

    const existingSequence = await db.sequence.findFirst({
      where: {
        id: params.id,
        businessId: session.user.businessId,
      },
    });

    if (!existingSequence) {
      return apiError("Sequence not found", 404);
    }

    const sequence = await db.sequence.update({
      where: { id: params.id },
      data: {
        ...(name && { name }),
        ...(status && { status }),
        ...(goal !== undefined && { goal }),
      },
    });

    return apiSuccess(sequence);
  } catch (error) {
    console.error(`PATCH /api/sequences/${params.id} error:`, error);
    return apiError("Failed to update sequence", 500);
  }
}

export async function DELETE(req: NextRequest, { params }: RouteParams) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.businessId) {
    return apiError("Unauthorized", 401);
  }

  try {
    const sequence = await db.sequence.findFirst({
      where: {
        id: params.id,
        businessId: session.user.businessId,
      },
    });

    if (!sequence) {
      return apiError("Sequence not found", 404);
    }

    if (sequence.status !== "DRAFT") {
      return apiError("Cannot delete active or archived sequences", 400);
    }

    await db.sequence.delete({
      where: { id: params.id },
    });

    return apiSuccess({ deleted: true });
  } catch (error) {
    console.error(`DELETE /api/sequences/${params.id} error:`, error);
    return apiError("Failed to delete sequence", 500);
  }
}
