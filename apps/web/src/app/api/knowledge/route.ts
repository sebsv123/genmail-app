/**
 * Knowledge Base API Routes
 * FASE 16F - Base de conocimiento sectorial
 */

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { db } from "@genmail/db";

// GET /api/knowledge?sector=xxx
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

    // Load all sector knowledge data
    const [benchmark, vocabulary, insights, templates] = await Promise.all([
      db.sectorBenchmark.findUnique({ where: { sector } }),
      db.sectorVocabulary.findMany({ where: { sector }, orderBy: { type: "asc" } }),
      db.sectorInsight.findMany({
        where: { sector },
        orderBy: [{ weight: "desc" }, { createdAt: "desc" }],
        take: 20,
      }),
      db.sectorTemplate.findMany({
        where: { sector, isActive: true },
        orderBy: { qualityScore: "desc" },
      }),
    ]);

    // Get business stats for comparison
    const businessId = session.user.businessId;
    const [totalEmails, openedEvents, clickedEvents] = await Promise.all([
      db.generatedEmail.count({
        where: { businessId, status: "SENT" },
      }),
      db.analyticsEvent.count({
        where: {
          type: "OPENED",
          lead: { businessId },
        },
      }),
      db.analyticsEvent.count({
        where: {
          type: "CLICKED",
          lead: { businessId },
        },
      }),
    ]);

    const businessMetrics = totalEmails > 0 ? {
      openRate: openedEvents / totalEmails,
      clickRate: clickedEvents / totalEmails,
      totalEmails,
    } : null;

    return NextResponse.json({
      sector,
      benchmark,
      vocabulary: {
        preferred: vocabulary.filter((v: any) => v.type === "PREFERRED").flatMap((v: any) => v.words),
        prohibited: vocabulary.filter((v: any) => v.type === "PROHIBITED").flatMap((v: any) => v.words),
        powerWords: vocabulary.filter((v: any) => v.type === "POWER_WORDS").flatMap((v: any) => v.words),
        weakWords: vocabulary.filter((v: any) => v.type === "WEAK_WORDS").flatMap((v: any) => v.words),
      },
      insights,
      templates,
      businessMetrics,
    });
  } catch (error) {
    console.error("[Knowledge API] Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
