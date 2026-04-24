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
    const lead = await db.lead.findFirst({
      where: {
        id: params.id,
        businessId: session.user.businessId,
      },
      include: {
        leadMemory: true,
        generatedEmails: {
          take: 5,
          orderBy: { createdAt: "desc" },
        },
      },
    });

    if (!lead) {
      return apiError("Lead not found", 404);
    }

    return apiSuccess(lead);
  } catch (error) {
    console.error(`GET /api/leads/${params.id} error:`, error);
    return apiError("Failed to fetch lead", 500);
  }
}

export async function PATCH(req: NextRequest, { params }: RouteParams) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.businessId) {
    return apiError("Unauthorized", 401);
  }

  try {
    const body = await req.json();
    const { stage, contextData, intentScore } = body;

    const existingLead = await db.lead.findFirst({
      where: {
        id: params.id,
        businessId: session.user.businessId,
      },
    });

    if (!existingLead) {
      return apiError("Lead not found", 404);
    }

    const lead = await db.lead.update({
      where: { id: params.id },
      data: {
        ...(stage && { stage }),
        ...(contextData && { contextData }),
        ...(intentScore !== undefined && { intentScore }),
      },
      include: {
        leadMemory: true,
      },
    });

    return apiSuccess(lead);
  } catch (error) {
    console.error(`PATCH /api/leads/${params.id} error:`, error);
    return apiError("Failed to update lead", 500);
  }
}

export async function DELETE(req: NextRequest, { params }: RouteParams) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.businessId) {
    return apiError("Unauthorized", 401);
  }

  try {
    const existingLead = await db.lead.findFirst({
      where: {
        id: params.id,
        businessId: session.user.businessId,
      },
    });

    if (!existingLead) {
      return apiError("Lead not found", 404);
    }

    // Soft delete - change stage to UNSUBSCRIBED
    const lead = await db.lead.update({
      where: { id: params.id },
      data: {
        stage: "UNSUBSCRIBED",
        unsubscribedAt: new Date(),
      },
    });

    return apiSuccess(lead);
  } catch (error) {
    console.error(`DELETE /api/leads/${params.id} error:`, error);
    return apiError("Failed to delete lead", 500);
  }
}
