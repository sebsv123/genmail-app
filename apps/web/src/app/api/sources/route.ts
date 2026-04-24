import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { addIngestSourceJob } from "@genmail/queue";
import { z } from "zod";

const sourceSchema = z.object({
  name: z.string().min(1).max(255),
  type: z.enum(["RSS", "URL", "DOCUMENT", "SAMPLE_EMAIL"]),
  url: z.string().url().optional(),
  content: z.string().optional(),
});

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.businessId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const validated = sourceSchema.parse(body);

    // Create source with PROCESSING status (will be updated when ingestion completes)
    const source = await db.knowledgeSource.create({
      data: {
        name: validated.name,
        type: validated.type,
        url: validated.url,
        content: validated.content,
        status: "PROCESSING", // Start as PROCESSING since we're about to ingest
        businessId: session.user.businessId,
        metadata: {
          createdBy: session.user.id,
          queuedAt: new Date().toISOString(),
        },
      },
    });

    // Queue ingestion job immediately
    await addIngestSourceJob(source.id);

    return NextResponse.json({
      success: true,
      source: {
        id: source.id,
        name: source.name,
        type: source.type,
        status: source.status,
        createdAt: source.createdAt,
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid input", details: error.errors },
        { status: 400 }
      );
    }
    console.error("POST /api/sources error:", error);
    return NextResponse.json(
      { error: "Failed to create knowledge source" },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.businessId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const sources = await db.knowledgeSource.findMany({
      where: { businessId: session.user.businessId },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        name: true,
        type: true,
        status: true,
        url: true,
        lastSyncedAt: true,
        createdAt: true,
        metadata: true,
      },
    });

    // Add chunks count for sources
    const sourcesWithCount = await Promise.all(
      sources.map(async (source) => {
        const chunksIndexed = await db.embeddingChunk.count({
          where: { sourceId: source.id },
        });
        return {
          ...source,
          chunksIndexed,
        };
      })
    );

    return NextResponse.json({ sources: sourcesWithCount });
  } catch (error) {
    console.error("GET /api/sources error:", error);
    return NextResponse.json(
      { error: "Failed to fetch knowledge sources" },
      { status: 500 }
    );
  }
}
