import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.businessId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const businessId = session.user.businessId;

  try {
    // Get standard analytics
    const [
      totalLeads,
      totalSequences,
      activeEnrollments,
      emailsSent,
      emailsPending,
    ] = await Promise.all([
      db.lead.count({ where: { businessId } }),
      db.sequence.count({ where: { businessId } }),
      db.sequenceEnrollment.count({
        where: {
          status: "ACTIVE",
          sequence: { businessId },
        },
      }),
      db.generatedEmail.count({
        where: { businessId, status: "SENT" },
      }),
      db.generatedEmail.count({
        where: { businessId, status: "PENDING_REVIEW" },
      }),
    ]);

    // Calculate conversion rate (simplified)
    const conversionRate = emailsSent > 0 ? (activeEnrollments / emailsSent) * 100 : 0;

    // ============== RAG STATS ==============
    const [
      totalChunksIndexed,
      sourcesReady,
      totalEmbeddings,
    ] = await Promise.all([
      // Total chunks indexed for this business
      db.embeddingChunk.count({ where: { businessId } }),
      // Sources with READY status
      db.knowledgeSource.count({
        where: { businessId, status: "READY" },
      }),
      // Total lead embeddings
      db.leadEmbedding.count({
        where: {
          lead: { businessId },
        },
      }),
    ]);

    // Get RAG usage from generated emails
    const recentEmails = await db.generatedEmail.findMany({
      where: { businessId },
      take: 100,
      orderBy: { createdAt: "desc" },
      select: {
        metadata: true,
      },
    });

    // Calculate avg chunks per email and avg similarity
    let totalChunksUsed = 0;
    let totalSimilarity = 0;
    let emailsWithRag = 0;

    for (const email of recentEmails) {
      const metadata = email.metadata as any;
      if (metadata?.ragInfo) {
        emailsWithRag++;
        totalChunksUsed += metadata.ragInfo.chunksUsed || 0;
        totalSimilarity += metadata.ragInfo.avgSimilarity || 0;
      }
    }

    const avgChunksPerEmail = emailsWithRag > 0 ? totalChunksUsed / emailsWithRag : 0;
    const avgSimilarityScore = emailsWithRag > 0 ? totalSimilarity / emailsWithRag : 0;

    return NextResponse.json({
      overview: {
        totalLeads,
        totalSequences,
        activeEnrollments,
        emailsSent,
        emailsPending,
        conversionRate: Math.round(conversionRate * 100) / 100,
      },
      ragStats: {
        totalChunksIndexed,
        sourcesReady,
        totalEmbeddings,
        avgChunksPerEmail: Math.round(avgChunksPerEmail * 100) / 100,
        avgSimilarityScore: Math.round(avgSimilarityScore * 100) / 100,
        tooltip: "Cuanto más chunks indexados, más personalizados serán tus emails",
      },
    });
  } catch (error) {
    console.error("GET /api/analytics/dashboard error:", error);
    return NextResponse.json(
      { error: "Failed to fetch analytics" },
      { status: 500 }
    );
  }
}
