import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { apiError, apiSuccess } from "@/lib/api";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function POST(req: NextRequest, { params }: RouteParams) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.businessId) {
    return apiError("Unauthorized", 401);
  }

  const { id } = await params;

  try {
    const body = await req.json();
    const { leadIds } = body;

    if (!Array.isArray(leadIds) || leadIds.length === 0) {
      return apiError("leadIds array is required", 400);
    }

    // Verify sequence exists and belongs to business
    const sequence = await db.sequence.findFirst({
      where: {
        id,
        businessId: session.user.businessId,
      },
    });

    if (!sequence) {
      return apiError("Sequence not found", 404);
    }

    // Verify all leads belong to business
    const leads = await db.lead.findMany({
      where: {
        id: { in: leadIds },
        businessId: session.user.businessId,
      },
    });

    if (leads.length !== leadIds.length) {
      return apiError("Some leads not found or don't belong to your business", 400);
    }

    // Check existing enrollments
    const existingEnrollments = await db.sequenceEnrollment.findMany({
      where: {
        sequenceId: id,
        leadId: { in: leadIds },
      },
    });

    const enrolledIds = new Set(existingEnrollments.map((e) => e.leadId));
    const newLeadIds = leadIds.filter((lid) => !enrolledIds.has(lid));

    // Create new enrollments
    const enrollments = await Promise.all(
      newLeadIds.map((leadId) =>
        db.sequenceEnrollment.create({
          data: {
            sequenceId: id,
            leadId,
            status: "ACTIVE",
            currentStep: 1,
          },
        })
      )
    );

    return apiSuccess({
      enrolled: enrollments.length,
      skipped: existingEnrollments.length,
    });
  } catch (error) {
    console.error(`POST /api/sequences/${id}/enroll error:`, error);
    return apiError("Failed to enroll leads", 500);
  }
}
