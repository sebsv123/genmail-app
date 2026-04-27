/**
 * Pixel Snippet API - FASE 18D
 * Devuelve el snippet HTML para insertar el pixel de seguimiento
 * Solo para planes AGENCY
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@genmail/db";

interface Params {
  params: Promise<{ businessId: string }>;
}

/**
 * GET /api/pixel/:businessId/snippet
 * Devuelve el snippet HTML para el pixel
 */
export async function GET(request: NextRequest, { params }: Params) {
  const { businessId } = await params;

  try {
    // Verificar que el business existe y tiene plan AGENCY
    const business = await prisma.business.findUnique({
      where: { id: businessId },
      select: { id: true, subscription: { select: { plan: true } } },
    });

    if (!business || business.subscription?.plan !== "AGENCY") {
      return NextResponse.json(
        { error: "Pixel tracking only available for AGENCY plan" },
        { status: 403 }
      );
    }

    const pixelUrl = `${process.env.NEXT_PUBLIC_APP_URL || "https://app.genmail.es"}/api/pixel/${businessId}`;
    
    const html = `<img src="${pixelUrl}" width="1" height="1" style="display:none;" alt="" />`;

    return NextResponse.json({
      html,
      url: pixelUrl,
      instructions: "Inserte este código en su sitio web para rastrear visitas"
    });

  } catch (error) {
    console.error("[Pixel Snippet] Error:", error);
    return NextResponse.json(
      { error: "Failed to generate snippet" },
      { status: 500 }
    );
  }
}
