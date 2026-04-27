import { Worker, Job } from "bullmq";
import { db } from "@genmail/db";
import { redisConnection, notificationQueue } from "@genmail/queue";

/**
 * A/B TEST WORKER
 * Automates A/B testing: generates variants, assigns to leads, evaluates winners
 */

const AB_TEST_QUEUE = "ab-test";

export const abTestWorker = new Worker(
  AB_TEST_QUEUE,
  async (job: Job) => {
    const { type } = job.data;
    console.log(`[AB Test Worker] Processing ${type}`);

    switch (type) {
      case "create-ab-test":
        return await createABTest(job.data);
      case "evaluate-ab-test":
        return await evaluateABTest(job.data);
      case "decide-variant":
        return await decideVariantForEnrollment(job.data);
      case "update-variant-stats":
        return await updateVariantStats(job.data);
      default:
        console.warn(`[AB Test Worker] Unknown job type: ${type}`);
        return { error: "Unknown job type" };
    }
  },
  {
    connection: redisConnection,
    concurrency: 1,
    autorun: false,
  }
);

/**
 * CreateABTestJob: Generate variants and create test
 */
async function createABTest(data: {
  enrollmentId: string;
  testType: string;
}): Promise<{ testId: string; assignedVariantId: string }> {
  const { enrollmentId, testType } = data;

  // Load enrollment with lead, sequence, template
  const enrollment = await db.sequenceEnrollment.findUnique({
    where: { id: enrollmentId },
    include: {
      lead: true,
      sequence: {
        include: {
          business: true,
        },
      },
      currentStep: true,
    },
  });

  if (!enrollment) {
    throw new Error(`Enrollment ${enrollmentId} not found`);
  }

  const businessId = enrollment.sequence.businessId;
  const sequenceId = enrollment.sequenceId;

  // Call AI service to generate variants
  const aiResponse = await fetch(`${process.env.AI_SERVICE_URL}/generate-ab-variants`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      business_id: businessId,
      lead_id: enrollment.leadId,
      sequence_goal: enrollment.sequence.goal,
      lead_context: enrollment.lead.contextData,
      business_context: enrollment.sequence.business,
      test_type: testType,
    }),
  });

  if (!aiResponse.ok) {
    throw new Error(`AI service failed: ${aiResponse.status}`);
  }

  const aiData: any = await aiResponse.json();

  // Create ABTest
  const test = await db.aBTest.create({
    data: {
      businessId,
      sequenceId,
      name: `${testType} Test - ${enrollment.sequence.name}`,
      status: "RUNNING",
      testType: testType as any,
      minSampleSize: 50,
      confidenceThreshold: 0.95,
    },
  });

  // Create Variant A
  const variantA = await db.aBVariant.create({
    data: {
      testId: test.id,
      name: "A",
      subject: aiData.variant_a.subject_suggestion || "",
      bodyHtml: aiData.variant_a.body_suggestion || "",
      bodyText: aiData.variant_a.body_suggestion || "",
      copyFramework: "AIDA", // Default or from AI
      hypothesis: aiData.variant_a.hypothesis,
    },
  });

  // Create Variant B
  const variantB = await db.aBVariant.create({
    data: {
      testId: test.id,
      name: "B",
      subject: aiData.variant_b.subject_suggestion || "",
      bodyHtml: aiData.variant_b.body_suggestion || "",
      bodyText: aiData.variant_b.body_suggestion || "",
      copyFramework: "PAS", // Default or from AI
      hypothesis: aiData.variant_b.hypothesis,
    },
  });

  // Decide variant by hashing leadId (ensures same lead always gets same variant)
  const leadIdHash = hashString(enrollment.leadId);
  const assignedVariant = leadIdHash % 2 === 0 ? variantA : variantB;

  console.log(`[AB Test Worker] Created test ${test.id}, assigned variant ${assignedVariant.name} to lead ${enrollment.leadId}`);

  return {
    testId: test.id,
    assignedVariantId: assignedVariant.id,
  };
}

/**
 * EvaluateABTestJob: Check if test has a winner
 */
async function evaluateABTest(data: { testId: string }): Promise<{
  completed: boolean;
  winner?: string;
  inconclusive?: boolean;
}> {
  const { testId } = data;

  // Load test with variants
  const test = await db.aBTest.findUnique({
    where: { id: testId },
    include: { variants: true },
  });

  if (!test || test.status !== "RUNNING") {
    return { completed: false };
  }

  if (test.variants.length !== 2) {
    return { completed: false };
  }

  const [variantA, variantB] = test.variants;

  // Check minimum sample size
  if (variantA.sent < test.minSampleSize || variantB.sent < test.minSampleSize) {
    console.log(`[AB Test Worker] Test ${testId} too early: A=${variantA.sent}, B=${variantB.sent} (need ${test.minSampleSize})`);
    return { completed: false };
  }

  // Calculate composite scores
  const scoreA = (variantA.openRate * 0.25) + (variantA.clickRate * 0.40) + (variantA.replyRate * 0.35);
  const scoreB = (variantB.openRate * 0.25) + (variantB.clickRate * 0.40) + (variantB.replyRate * 0.35);

  // Calculate winning margin
  const maxScore = Math.max(scoreA, scoreB);
  const minScore = Math.min(scoreA, scoreB);
  const margin = maxScore > 0 ? (maxScore - minScore) / maxScore : 0;

  // Check if we have a clear winner (margin >= 1 - confidenceThreshold)
  const significanceThreshold = 1 - test.confidenceThreshold; // 0.05 for 95% confidence
  const hasWinner = margin >= significanceThreshold;

  // Check if total samples exceed max (3x minSampleSize = inconclusive)
  const totalSent = variantA.sent + variantB.sent;
  const maxSamples = test.minSampleSize * 3;
  const shouldConclude = totalSent >= maxSamples;

  if (!hasWinner && !shouldConclude) {
    return { completed: false };
  }

  // Get AI analysis
  let winnerId: string | null = null;
  let explanation = "";
  let learnings: string[] = [];

  if (hasWinner) {
    winnerId = scoreA > scoreB ? variantA.id : variantB.id;

    // Call AI for explanation
    const aiResponse = await fetch(`${process.env.AI_SERVICE_URL}/analyze-ab-results`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        variant_a: {
          hypothesis: variantA.hypothesis,
          sent: variantA.sent,
          opened: variantA.opened,
          clicked: variantA.clicked,
          replied: variantA.replied,
          openRate: variantA.openRate,
          clickRate: variantA.clickRate,
          replyRate: variantA.replyRate,
        },
        variant_b: {
          hypothesis: variantB.hypothesis,
          sent: variantB.sent,
          opened: variantB.opened,
          clicked: variantB.clicked,
          replied: variantB.replied,
          openRate: variantB.openRate,
          clickRate: variantB.clickRate,
          replyRate: variantB.replyRate,
        },
        test_type: test.testType,
        sector: "",
      }),
    });

    if (aiResponse.ok) {
      const aiData: any = await aiResponse.json();
      explanation = aiData.explanation;
      learnings = aiData.learnings || [];
    }
  }

  // Update test status
  await db.aBTest.update({
    where: { id: testId },
    data: {
      status: "COMPLETED",
      completedAt: new Date(),
      winnerVariantId: winnerId,
    },
  });

  // Create notification
  const business = await db.business.findUnique({
    where: { id: test.businessId },
    include: { users: { where: { role: "OWNER" } } },
  });

  if (business && business.users.length > 0) {
    const title = winnerId
      ? `🏆 Test A/B completado: variante ${scoreA > scoreB ? "A" : "B"} ganó con ${Math.round(margin * 100)}% más de engagement`
      : "📊 Test A/B inconcluso: ambas variantes tienen rendimiento similar";

    await db.notification.create({
      data: {
        userId: business.users[0].id,
        businessId: test.businessId,
        type: "ab_test_complete",
        title,
        body: explanation || "El test ha concluido. Revisa los resultados en el dashboard.",
        actionUrl: `/experiments/${testId}`,
      },
    });
  }

  // Integrate with learning system (Fase 13)
  if (winnerId) {
    const winnerVariant = winnerId === variantA.id ? variantA : variantB;

    // Create learning event
    await db.learningEvent.create({
      data: {
        businessId: test.businessId,
        leadId: null,
        emailId: null,
        eventType: "CONVERTED",
        patternType: test.testType as any,
        patternValue: winnerVariant.hypothesis,
        signal: 1.0,
        processed: true,
      },
    });

    // Update PerformancePattern
    await updatePerformancePattern(test.businessId, test.testType, winnerVariant);
  }

  return {
    completed: true,
    winner: winnerId ? (scoreA > scoreB ? "A" : "B") : undefined,
    inconclusive: !winnerId,
  };
}

/**
 * DecideVariantForEnrollmentJob: Which variant to use for this lead
 */
async function decideVariantForEnrollment(data: { enrollmentId: string }): Promise<{
  useVariant: boolean;
  variantId?: string;
  createTest?: boolean;
  testType?: string;
}> {
  const { enrollmentId } = data;

  // Load enrollment with sequence
  const enrollment = await db.sequenceEnrollment.findUnique({
    where: { id: enrollmentId },
    include: {
      sequence: true,
    },
  });

  if (!enrollment) {
    return { useVariant: false };
  }

  const sequenceId = enrollment.sequenceId;

  // Check for completed test with winner
  const completedTest = await db.aBTest.findFirst({
    where: {
      sequenceId,
      status: "COMPLETED",
      winnerVariantId: { not: null },
    },
    include: { variants: true },
  });

  if (completedTest && completedTest.winnerVariantId) {
    // Always use winner variant
    return {
      useVariant: true,
      variantId: completedTest.winnerVariantId,
    };
  }

  // Check for running test
  const runningTest = await db.aBTest.findFirst({
    where: {
      sequenceId,
      status: "RUNNING",
    },
    include: { variants: true },
  });

  if (runningTest && runningTest.variants.length === 2) {
    // Assign by hash of leadId (consistency)
    const leadIdHash = hashString(enrollment.leadId);
    const assignedVariant = leadIdHash % 2 === 0
      ? runningTest.variants[0]
      : runningTest.variants[1];

    return {
      useVariant: true,
      variantId: assignedVariant.id,
    };
  }

  // Decide if we should create a new test
  // Conditions: sequence has >= 20 emails sent, max 1 test active, 30% probability
  const emailsSent = await db.generatedEmail.count({
    where: {
      enrollment: {
        sequenceId,
      },
    },
  });

  if (emailsSent >= 20) {
    const activeTests = await db.aBTest.count({
      where: {
        sequenceId,
        status: "RUNNING",
      },
    });

    if (activeTests === 0) {
      // 30% probability to create test
      if (Math.random() < 0.3) {
        // Determine test type based on least explored pattern
        const testType = await determineTestType(enrollment.sequence.businessId);
        return {
          useVariant: false,
          createTest: true,
          testType,
        };
      }
    }
  }

  return { useVariant: false };
}

/**
 * Update variant stats when email events occur
 */
async function updateVariantStats(data: {
  abVariantId: string;
  eventType: "OPENED" | "CLICKED" | "REPLIED";
}): Promise<void> {
  const { abVariantId, eventType } = data;

  const variant = await db.aBVariant.findUnique({
    where: { id: abVariantId },
    include: { test: true },
  });

  if (!variant) return;

  // Update counters
  const updateData: any = {};

  if (eventType === "OPENED") {
    updateData.opened = { increment: 1 };
  } else if (eventType === "CLICKED") {
    updateData.clicked = { increment: 1 };
  } else if (eventType === "REPLIED") {
    updateData.replied = { increment: 1 };
  }

  await db.aBVariant.update({
    where: { id: abVariantId },
    data: updateData,
  });

  // Recalculate rates
  const updatedVariant = await db.aBVariant.findUnique({
    where: { id: abVariantId },
  });

  if (!updatedVariant || updatedVariant.sent === 0) return;

  const openRate = updatedVariant.opened / updatedVariant.sent;
  const clickRate = updatedVariant.clicked / updatedVariant.sent;
  const replyRate = updatedVariant.replied / updatedVariant.sent;
  const compositeScore = (openRate * 0.25) + (clickRate * 0.40) + (replyRate * 0.35);

  await db.aBVariant.update({
    where: { id: abVariantId },
    data: {
      openRate,
      clickRate,
      replyRate,
      compositeScore,
    },
  });

  // Trigger evaluation if we have enough samples
  if (updatedVariant.sent >= variant.test.minSampleSize) {
    // Queue evaluation job
    const { abTestQueue } = await import("@genmail/queue");
    await abTestQueue.add("evaluate-ab-test", {
      type: "evaluate-ab-test",
      testId: variant.testId,
    });
  }
}

/**
 * Helper: Simple hash function for consistent variant assignment
 */
function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash);
}

/**
 * Helper: Determine which test type to run based on least explored patterns
 */
async function determineTestType(businessId: string): Promise<string> {
  const patterns = await db.performancePattern.groupBy({
    by: ["patternType"],
    where: { businessId },
    _count: { id: true },
  });

  const allTypes = ["SUBJECT_LINE", "COPY_FRAMEWORK", "EMAIL_LENGTH", "CTA_TYPE", "SEND_TIME"];
  const typeCounts: Record<string, number> = {};

  allTypes.forEach((type) => (typeCounts[type] = 0));
  patterns.forEach((p: any) => (typeCounts[p.patternType] = p._count.id));

  // Pick type with fewest patterns
  const sorted = allTypes.sort((a, b) => typeCounts[a] - typeCounts[b]);
  return sorted[0];
}

/**
 * Helper: Update PerformancePattern with A/B test winner
 * Tracks consecutive wins and creates notifications for confirmed patterns
 */
async function updatePerformancePattern(
  businessId: string,
  testType: string,
  winnerVariant: any,
): Promise<void> {
  // Find or create pattern
  let pattern = await db.performancePattern.findFirst({
    where: {
      businessId,
      patternType: testType as any,
      patternValue: winnerVariant.hypothesis,
    },
  });

  let consecutiveWins = 1;

  if (pattern) {
    // Track consecutive wins using metadata
    const metadata = (pattern.metadata as any) || {};
    const currentWins = metadata.consecutiveWins || 0;
    consecutiveWins = currentWins + 1;

    // Update with confidence boost from A/B test
    let newConfidence = Math.min(1.0, pattern.confidenceScore + 0.2);

    // If 3 consecutive wins, set max confidence
    if (consecutiveWins >= 3) {
      newConfidence = 1.0;
    }

    await db.performancePattern.update({
      where: { id: pattern.id },
      data: {
        sampleSize: { increment: winnerVariant.sent },
        confidenceScore: newConfidence,
        metadata: {
          ...metadata,
          consecutiveWins,
          lastWinAt: new Date().toISOString(),
        },
      },
    });

    // If 3 consecutive wins reached, create notification
    if (consecutiveWins === 3) {
      const owner = await db.user.findFirst({
        where: { businessId, role: "owner" },
      });

      if (owner) {
        const typeDescriptions: Record<string, string> = {
          SUBJECT_LINE: "El tipo de subject line que usas",
          COPY_FRAMEWORK: "El framework de copy elegido",
          EMAIL_LENGTH: "La longitud de email que usas",
          CTA_TYPE: "El tipo de llamado a la acción",
          SEND_TIME: "El momento de envío que seleccionas",
          HOOK_TYPE: "El tipo de gancho inicial",
        };

        await db.notification.create({
          data: {
            userId: owner.id,
            businessId,
            type: "pattern_confirmed",
            title: "💡 Patrón confirmado",
            body: `${typeDescriptions[testType] || "Este patrón"} siempre funciona mejor en tu negocio. GenMail lo usará automáticamente en futuros emails.`,
            metadata: {
              patternType: testType,
              patternValue: winnerVariant.hypothesis,
              consecutiveWins,
            },
          },
        });

        console.log(`[AB Test Worker] Pattern confirmed: ${testType} - ${winnerVariant.hypothesis}`);
      }
    }
  } else {
    // Create new pattern
    await db.performancePattern.create({
      data: {
        businessId,
        patternType: testType as any,
        patternValue: winnerVariant.hypothesis,
        sampleSize: winnerVariant.sent,
        openRate: winnerVariant.openRate,
        clickRate: winnerVariant.clickRate,
        replyRate: winnerVariant.replyRate,
        conversionRate: winnerVariant.replied / winnerVariant.sent,
        confidenceScore: 0.8, // High initial confidence from A/B test
        metadata: {
          consecutiveWins: 1,
          firstWinAt: new Date().toISOString(),
        },
      },
    });
  }
}
