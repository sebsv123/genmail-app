/**
 * Knowledge Base Templates API Routes
 * FASE 16F - Base de conocimiento sectorial
 */

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { db } from "@genmail/db";

// GET /api/knowledge/templates?sector=xxx
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const sector = searchParams.get("sector");

    if (!sector) {
      return NextResponse.json({ error: "Sector parameter required" }, { status: 400 });
    }

    const templates = await db.sectorTemplate.findMany({
      where: { sector, isActive: true },
      orderBy: { qualityScore: "desc" },
    });

    return NextResponse.json({ templates });
  } catch (error) {
    console.error("[Knowledge Templates API] Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// POST /api/knowledge/templates - Create custom template (plan PRO+)
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Only owners can create templates
    if (session.user.role !== "owner") {
      return NextResponse.json({ error: "Only owners can create custom templates" }, { status: 403 });
    }

    const body = await req.json();
    const { sector, name, sequenceMode, subject, bodyText, copyFramework, goal } = body;

    if (!sector || !name || !sequenceMode || !subject || !bodyText) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // Create custom template (marked as inactive until approved)
    const template = await db.sectorTemplate.create({
      data: {
        sector,
        name,
        sequenceMode,
        subject,
        bodyText,
        copyFramework: copyFramework || "AIDA",
        goal: goal || "Custom template",
        qualityScore: 0.7, // Lower score for custom templates until validated
        isActive: false, // Needs admin review
        stepNumber: 1,
      },
    });

    return NextResponse.json({ template }, { status: 201 });
  } catch (error) {
    console.error("[Knowledge Templates API] Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
