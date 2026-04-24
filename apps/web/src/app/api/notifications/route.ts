import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = session.user.id;

  try {
    // Get unread notifications
    const notifications = await db.notification.findMany({
      where: {
        userId,
        readAt: null,
      },
      orderBy: { createdAt: "desc" },
      take: 20,
    });

    // Mark as delivered (update deliveredAt)
    await db.notification.updateMany({
      where: {
        id: { in: notifications.map((n) => n.id) },
        deliveredAt: null,
      },
      data: {
        deliveredAt: new Date(),
      },
    });

    return NextResponse.json({ notifications });
  } catch (error) {
    console.error("GET /api/notifications error:", error);
    return NextResponse.json({ error: "Failed to fetch notifications" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = session.user.id;

  try {
    const { notificationId, action } = await req.json();

    if (action === "mark-read") {
      await db.notification.updateMany({
        where: {
          userId,
          id: notificationId ? { equals: notificationId } : undefined,
          readAt: null,
        },
        data: { readAt: new Date() },
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("PATCH /api/notifications error:", error);
    return NextResponse.json({ error: "Failed to update notifications" }, { status: 500 });
  }
}
