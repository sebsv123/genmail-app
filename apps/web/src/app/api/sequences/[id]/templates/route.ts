import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { apiError, apiSuccess } from "@/lib/api";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(req: NextRequest, { params }: RouteParams) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.businessId) {
    return apiError("Unauthorized", 401);
  }

  const { id } = await params;

  try {
    const sequence = await db.sequence.findFirst({
      where: {
        id,
        businessId: session.user.businessId,
      },
    });

    if (!sequence) {
      return apiError("Sequence not found", 404);
    }

    const templates = await db.emailTemplate.findMany({
      where: {
        sequenceId: id,
      },
      orderBy: {
        stepNumber: "asc",
      },
    });

    return apiSuccess(templates);
  } catch (error) {
    console.error(`GET /api/sequences/${id}/templates error:`, error);
    return apiError("Failed to fetch templates", 500);
  }
}

export async function POST(req: NextRequest, { params }: RouteParams) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.businessId) {
    return apiError("Unauthorized", 401);
  }

  const { id } = await params;

  try {
    const body = await req.json();
    const { stepNumber, subject, bodyHtml, bodyText, copyFramework, goal } = body;

    if (!stepNumber || !subject || !bodyHtml) {
      return apiError("stepNumber, subject, and bodyHtml are required", 400);
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

    const template = await db.emailTemplate.create({
      data: {
        sequenceId: id,
        stepNumber,
        subject,
        bodyHtml,
        bodyText: bodyText || "",
        copyFramework,
        goal,
      },
    });

    return apiSuccess(template);
  } catch (error) {
    console.error(`POST /api/sequences/${id}/templates error:`, error);
    return apiError("Failed to create template", 500);
  }
}
