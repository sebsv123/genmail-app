/**
 * Trends API - FASE 18G
 * GET /api/signals/trends - SectorTrends del sector del business
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@genmail/db";
import { requireAuth } from "../../../../lib/auth";

export async function GET(request: NextRequest) {
  const session = await requireAuth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const businessId = session.user.businessId;
  if (!businessId) {
    return NextResponse.json({ error: "No business found" }, { status: 400 });
  }

  try {
    // Obtener el sector del business
    const business = await prisma.business.findUnique({
      where: { id: businessId },
      select: { sector: true },
    });

    if (!business?.sector) {
      return NextResponse.json(
        { error: "Business has no sector configured" },
        { status: 400 }
      );
    }

    // Trend de últimas 24h
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

    const trends = await prisma.sectorTrend.findMany({
      where: {
        sector: business.sector,
        recordedAt: { gte: oneDayAgo },
      },
      orderBy: { trendScore: "desc" },
      take: 10,
    });

    // Calcular si hay spike
    const hasSpike = trends.some((t) => t.trendScore > 80 && t.weeklyChange > 30);

    return NextResponse.json({
      sector: business.sector,
      trends: trends.map((t) => ({
        keyword: t.keyword,
        trendScore: t.trendScore,
        weeklyChange: t.weeklyChange,
        region: t.region,
        recordedAt: t.recordedAt,
      })),
      hasSpike,
      lastUpdated: trends[0]?.recordedAt || null,
    });
  } catch (error) {
    console.error("[Trends API] Error:", error);
    return NextResponse.json({ error: "Failed to fetch trends" }, { status: 500 });
  }
}
