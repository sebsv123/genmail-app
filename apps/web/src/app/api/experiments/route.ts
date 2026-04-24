import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

// GET /api/experiments - List all A/B tests for business
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.businessId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const businessId = session.user.businessId;

  try {
    const tests = await db.aBTest.findMany({
      where: { businessId },
      include: {
        variants: true,
        sequence: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ tests });
  } catch (error) {
    console.error("GET /api/experiments error:", error);
    return NextResponse.json({ error: "Failed to fetch experiments" }, { status: 500 });
  }
}

// POST /api/experiments - Create manual A/B test
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.businessId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const businessId = session.user.businessId;

  try {
    const { sequenceId, testType, name } = await req.json();

    if (!sequenceId || !testType) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // Check if there's already a running test for this sequence
    const existingTest = await db.aBTest.findFirst({
      where: {
        sequenceId,
        status: "RUNNING",
      },
    });

    if (existingTest) {
      return NextResponse.json(
        { error: "There is already an active test for this sequence" },
        { status: 400 }
      );
    }

    // Create the test
    const test = await db.aBTest.create({
      data: {
        businessId,
        sequenceId,
        name: name || `${testType} Test`,
        status: "RUNNING",
        testType: testType as any,
        minSampleSize: 50,
        confidenceThreshold: 0.95,
      },
    });

    // Get AI suggestions for variants
    const sequence = await db.sequence.findUnique({
      where: { id: sequenceId },
      include: { business: true },
    });

    let variantA, variantB;

    try {
      const aiResponse = await fetch(`${process.env.AI_SERVICE_URL}/generate-ab-variants`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          business_id: businessId,
          lead_id: "",
          sequence_goal: sequence?.goal || "",
          lead_context: {},
          business_context: sequence?.business,
          test_type: testType,
        }),
      });

      if (aiResponse.ok) {
        const aiData = await aiResponse.json();

        // Create Variant A
        variantA = await db.aBVariant.create({
          data: {
            testId: test.id,
            name: "A",
            subject: aiData.variant_a?.subject_suggestion || "",
            bodyHtml: aiData.variant_a?.body_suggestion || "",
            bodyText: aiData.variant_a?.body_suggestion || "",
            hypothesis: aiData.variant_a?.hypothesis || "",
            copyFramework: "AIDA",
          },
        });

        // Create Variant B
        variantB = await db.aBVariant.create({
          data: {
            testId: test.id,
            name: "B",
            subject: aiData.variant_b?.subject_suggestion || "",
            bodyHtml: aiData.variant_b?.body_suggestion || "",
            bodyText: aiData.variant_b?.body_suggestion || "",
            hypothesis: aiData.variant_b?.hypothesis || "",
            copyFramework: "PAS",
          },
        });
      }
    } catch (aiError) {
      console.error("AI variant generation failed:", aiError);
      // Create default variants if AI fails
      variantA = await db.aBVariant.create({
        data: {
          testId: test.id,
          name: "A",
          subject: "Variant A",
          bodyHtml: "<p>Variant A body</p>",
          bodyText: "Variant A body",
          hypothesis: "Default variant A",
          copyFramework: "AIDA",
        },
      });

      variantB = await db.aBVariant.create({
        data: {
          testId: test.id,
          name: "B",
          subject: "Variant B",
          bodyHtml: "<p>Variant B body</p>",
          bodyText: "Variant B body",
          hypothesis: "Default variant B",
          copyFramework: "PAS",
        },
      });
    }

    return NextResponse.json({
      test: await db.aBTest.findUnique({
        where: { id: test.id },
        include: { variants: true },
      }),
    });
  } catch (error) {
    console.error("POST /api/experiments error:", error);
    return NextResponse.json({ error: "Failed to create experiment" }, { status: 500 });
  }
}
