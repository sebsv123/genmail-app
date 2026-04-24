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
    const business = await db.business.findUnique({
      where: { id: session.user.businessId },
      include: {
        leads: {
          where: { status: { not: "bounced" } },
          select: {
            status: true,
            emails: {
              select: { openedAt: true, clickedAt: true },
            },
          },
        },
      },
    });

    // Calculate business metrics
    const totalEmails = business?.leads.reduce((sum, lead) => sum + lead.emails.length, 0) || 0;
    const openedEmails = business?.leads.reduce((sum, lead) => sum + lead.emails.filter(e => e.openedAt).length, 0) || 0;
    const clickedEmails = business?.leads.reduce((sum, lead) => sum + lead.emails.filter(e => e.clickedAt).length, 0) || 0;

    const businessMetrics = totalEmails > 0 ? {
      openRate: openedEmails / totalEmails,
      clickRate: clickedEmails / totalEmails,
      totalEmails,
    } : null;

    return NextResponse.json({
      sector,
      benchmark,
      vocabulary: {
        preferred: vocabulary.filter(v => v.type === "PREFERRED").flatMap(v => v.words),
        prohibited: vocabulary.filter(v => v.type === "PROHIBITED").flatMap(v => v.words),
        powerWords: vocabulary.filter(v => v.type === "POWER_WORDS").flatMap(v => v.words),
        weakWords: vocabulary.filter(v => v.type === "WEAK_WORDS").flatMap(v => v.words),
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
