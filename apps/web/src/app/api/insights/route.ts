import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { redisConnection } from "@genmail/queue";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.businessId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const businessId = session.user.businessId;

  try {
    // Load performance patterns
    const patterns = await db.performancePattern.findMany({
      where: {
        businessId,
        sampleSize: { gte: 5 },
      },
      orderBy: { confidenceScore: "desc" },
    });

    // Get total emails analyzed
    const totalEmails = await db.learningEvent.count({
      where: { businessId },
    });

    // Call AI service for insights
    let insights: string[] = [];
    let recommendations: string[] = [];
    let summary = "";

    try {
      const aiResponse = await fetch(`${process.env.AI_SERVICE_URL}/analyze-performance-insights`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          business_id: businessId,
          patterns,
          sector: "",
        }),
      });

      if (aiResponse.ok) {
        const aiData = await aiResponse.json();
        insights = aiData.insights || [];
        recommendations = aiData.recommendations || [];
        summary = aiData.summary || "";
      }
    } catch (aiError) {
      console.error("AI insights failed:", aiError);
    }

    return NextResponse.json({
      patterns,
      insights,
      recommendations,
      summary,
      totalEmailsAnalyzed: totalEmails,
    });
  } catch (error) {
    console.error("GET /api/insights error:", error);
    return NextResponse.json({ error: "Failed to fetch insights" }, { status: 500 });
  }
}
