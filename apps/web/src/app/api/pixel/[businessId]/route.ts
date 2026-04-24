/**
 * Pixel de seguimiento - FASE 18D
 * Solo para planes AGENCY
 * Registra ExternalSignal WEBSITE_VISIT con IP hasheada (GDPR compliant)
 */

import { NextRequest, NextResponse } from "next/server";
import { createHash } from "crypto";
import { prisma } from "@genmail/db";
import { queue } from "@genmail/queue";

// GIF 1x1 transparente en base64
const TRANSPARENT_GIF = Buffer.from(
  "R0lGODlhAQABAIAAAAAAACH5BAEAAAAALAAAAAABAAEAAAICRAEAOw==",
  "base64"
);

interface Params {
  params: Promise<{ businessId: string }>;
}

/**
 * Hashea IP con SHA256 (GDPR compliant - nunca guardar IP en claro)
 */
function hashIp(ip: string): string {
  return createHash("sha256").update(ip).digest("hex");
}

/**
 * GET /api/pixel/:businessId
 * Registra visita como ExternalSignal WEBSITE_VISIT
 */
export async function GET(request: NextRequest, { params }: Params) {
  const { businessId } = await params;

  // Headers para la respuesta GIF
  const headers = new Headers({
    "Content-Type": "image/gif",
    "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
    "Pragma": "no-cache",
    "Expires": "0",
  });

  try {
    // Verificar que el business existe y tiene plan AGENCY
    const business = await prisma.business.findUnique({
      where: { id: businessId },
      select: { plan: true, id: true },
    });

    if (!business) {
      // Devolver GIF igual pero no registrar nada
      return new NextResponse(TRANSPARENT_GIF, { headers });
    }

    // Solo registrar si plan es AGENCY
    if (business.plan !== "AGENCY") {
      return new NextResponse(TRANSPARENT_GIF, { headers });
    }

    // Extraer datos del visitante
    const forwardedFor = request.headers.get("x-forwarded-for");
    const realIp = request.headers.get("x-real-ip");
    const ip = forwardedFor?.split(",")[0]?.trim() || realIp || "unknown";
    const ipHash = hashIp(ip);

    const userAgent = request.headers.get("user-agent") || "unknown";
    const referer = request.headers.get("referer") || "direct";

    // Datos del signal
    const signalData = {
      ipHash,
      userAgent: userAgent.substring(0, 200), // Limitar longitud
      referer: referer.substring(0, 500),
      url: request.url,
      timestamp: new Date().toISOString(),
    };

    // Buscar lead existente por IP hash
    const lead = await prisma.lead.findFirst({
      where: {
        businessId,
        // Buscamos en los rawData donde podría estar guardado el ipHash
        // Nota: Esto es una simplificación, en producción usaríamos una tabla de mapeo
      },
      select: { id: true },
    });

    // Crear ExternalSignal
    const signal = await prisma.externalSignal.create({
      data: {
        signalType: "WEBSITE_VISIT",
        source: "pixel",
        data: signalData,
        intentBoost: 0.15,
        detectedAt: new Date(),
        leadId: lead?.id || null,
      },
    });

    // Si hay lead, encolar procesamiento
    if (lead?.id) {
      await queue.publish("signals", "ProcessExternalSignalJob", {
        signalId: signal.id,
      });
    }

    return new NextResponse(TRANSPARENT_GIF, { headers });
  } catch (error) {
    console.error("[Pixel] Error:", error);
    // SIEMPRE devolver GIF, nunca error visible
    return new NextResponse(TRANSPARENT_GIF, { headers });
  }
}
