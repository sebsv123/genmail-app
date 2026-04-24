/**
 * Signals API - FASE 18G
 * GET /api/signals - ExternalSignals del business últimas 72h
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@genmail/db";
import { requireAuth } from "../../../lib/auth";

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
    // Señales de los últimos 72h
    const threeDaysAgo = new Date(Date.now() - 72 * 60 * 60 * 1000);

    // Buscar leads del business
    const leads = await prisma.lead.findMany({
      where: { businessId },
      select: { id: true },
    });

    const leadIds = leads.map((l) => l.id);

    // Buscar prospects del business vía ICP
    const prospects = await prisma.prospect.findMany({
      where: {
        icp: {
          businessId,
        },
      },
      select: { id: true },
    });

    const prospectIds = prospects.map((p) => p.id);

    // Obtener señales
    const signals = await prisma.externalSignal.findMany({
      where: {
        OR: [
          { leadId: { in: leadIds } },
          { prospectId: { in: prospectIds } },
        ],
        detectedAt: { gte: threeDaysAgo },
      },
      orderBy: { detectedAt: "desc" },
      take: 20,
      include: {
        lead: {
          select: { id: true, name: true, email: true },
        },
        prospect: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
      },
    });

    return NextResponse.json({
      signals: signals.map((s) => ({
        id: s.id,
        signalType: s.signalType,
        source: s.source,
        intentBoost: s.intentBoost,
        detectedAt: s.detectedAt,
        processedAt: s.processedAt,
        lead: s.lead,
        prospect: s.prospect,
      })),
    });
  } catch (error) {
    console.error("[Signals API] Error:", error);
    return NextResponse.json({ error: "Failed to fetch signals" }, { status: 500 });
  }
}
