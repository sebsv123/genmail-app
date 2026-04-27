import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

// DELETE /api/experiments/:id - Stop an A/B test
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.businessId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const businessId = session.user.businessId;
  const { id } = await params;

  try {
    // Verify the test belongs to this business
    const test = await db.aBTest.findFirst({
      where: {
        id,
        businessId,
      },
    });

    if (!test) {
      return NextResponse.json({ error: "Test not found" }, { status: 404 });
    }

    if (test.status === "STOPPED" || test.status === "COMPLETED") {
      return NextResponse.json({ error: "Test is already stopped or completed" }, { status: 400 });
    }

    // Stop the test
    await db.aBTest.update({
      where: { id },
      data: {
        status: "STOPPED",
        completedAt: new Date(),
      },
    });

    // Create notification
    const owner = await db.user.findFirst({
      where: { businessId, role: "OWNER" },
    });

    if (owner) {
      await db.notification.create({
        data: {
          userId: owner.id,
          businessId,
          type: "ab_test_stopped",
          title: "🛑 Test A/B detenido manualmente",
          body: `El test "${test.name}" ha sido detenido antes de completarse.`,
        },
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE /api/experiments/:id error:", error);
    return NextResponse.json({ error: "Failed to stop experiment" }, { status: 500 });
  }
}
