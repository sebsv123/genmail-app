import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { addIngestSourceJob } from "@genmail/queue";

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.businessId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = params;

  try {
    // Verify source belongs to the user's business
    const source = await db.knowledgeSource.findFirst({
      where: {
        id,
        businessId: session.user.businessId,
      },
      select: {
        id: true,
        name: true,
        type: true,
        status: true,
        url: true,
        lastSyncedAt: true,
        metadata: true,
        createdAt: true,
      },
    });

    if (!source) {
      return NextResponse.json(
        { error: "Knowledge source not found" },
        { status: 404 }
      );
    }

    // Count indexed chunks
    const chunksIndexed = await db.embeddingChunk.count({
      where: { sourceId: id },
    });

    return NextResponse.json({
      id: source.id,
      name: source.name,
      type: source.type,
      status: source.status,
      chunksIndexed,
      lastIngested: source.lastSyncedAt,
      url: source.url,
      error: source.metadata?.error || null,
    });
  } catch (error) {
    console.error("GET /api/sources/[id]/status error:", error);
    return NextResponse.json(
      { error: "Failed to fetch source status" },
      { status: 500 }
    );
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.businessId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = params;

  try {
    // Verify source belongs to the user's business
    const source = await db.knowledgeSource.findFirst({
      where: {
        id,
        businessId: session.user.businessId,
      },
    });

    if (!source) {
      return NextResponse.json(
        { error: "Knowledge source not found" },
        { status: 404 }
      );
    }

    // Update status to PROCESSING
    await db.knowledgeSource.update({
      where: { id },
      data: {
        status: "PROCESSING",
        metadata: {
          ...source.metadata,
          requeuedAt: new Date().toISOString(),
        },
      },
    });

    // Queue re-ingestion
    await addIngestSourceJob(id);

    return NextResponse.json({
      success: true,
      message: "Re-indexing started",
      sourceId: id,
    });
  } catch (error) {
    console.error("POST /api/sources/[id]/status error:", error);
    return NextResponse.json(
      { error: "Failed to re-index source" },
      { status: 500 }
    );
  }
}
