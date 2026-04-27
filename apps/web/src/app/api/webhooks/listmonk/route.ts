import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

// Parse Listmonk webhook payload
interface ListmonkEvent {
  event: string;
  data: {
    subscriber?: {
      id: number;
      uuid: string;
      email: string;
      name?: string;
    };
    campaign?: {
      id: number;
      name: string;
      status: string;
    };
    link?: string;
    ip_address?: string;
  };
}

export async function POST(req: NextRequest) {
  try {
    // Verify webhook signature if configured
    const signature = req.headers.get("X-Listmonk-Signature");
    const secret = process.env.LISTMONK_WEBHOOK_SECRET;
    
    if (secret && signature !== secret) {
      console.error("[Webhook] Invalid signature");
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }

    const event = (await req.json()) as ListmonkEvent;
    console.log(`[Webhook] Received ${event.event} event`);

    const email = event.data.subscriber?.email;
    if (!email) {
      return NextResponse.json({ error: "No email in event" }, { status: 400 });
    }

    // Find lead by email (email is not globally unique, only within business)
    const lead = await db.lead.findFirst({
      where: { email },
      include: {
        memory: true,
      },
    });

    if (!lead) {
      console.log(`[Webhook] No lead found for email: ${email}`);
      return NextResponse.json({ received: true, note: "Lead not found" });
    }

    // Find enrollment
    const enrollment = await db.sequenceEnrollment.findFirst({
      where: {
        leadId: lead.id,
        status: "ACTIVE",
      },
      orderBy: { enrolledAt: "desc" },
    });

    // Handle different event types
    switch (event.event) {
      case "subscriber.opened": {
        // Record OPENED event and update intent score
        await db.analyticsEvent.create({
          data: {
            leadId: lead.id,
            type: "OPENED",
            metadata: {
              campaignId: event.data.campaign?.id,
              ipAddress: event.data.ip_address,
              enrollmentId: enrollment?.id,
            },
          },
        });

        // Increase intent score
        await db.lead.update({
          where: { id: lead.id },
          data: {
            intentScore: Math.min(1, (lead.intentScore || 0) + 0.1),
          },
        });
        break;
      }

      case "subscriber.clicked": {
        // Record CLICKED event and update intent score
        await db.analyticsEvent.create({
          data: {
            leadId: lead.id,
            type: "CLICKED",
            metadata: {
              campaignId: event.data.campaign?.id,
              link: event.data.link,
              ipAddress: event.data.ip_address,
              enrollmentId: enrollment?.id,
            },
          },
        });

        // Increase intent score more for clicks
        await db.lead.update({
          where: { id: lead.id },
          data: {
            intentScore: Math.min(1, (lead.intentScore || 0) + 0.2),
          },
        });
        break;
      }

      case "subscriber.replied": {
        // Record REPLIED event - major intent signal
        await db.analyticsEvent.create({
          data: {
            leadId: lead.id,
            type: "REPLIED",
            metadata: {
              campaignId: event.data.campaign?.id,
              enrollmentId: enrollment?.id,
            },
          },
        });

        // Update lead stage to QUALIFIED and max out intent score
        await db.lead.update({
          where: { id: lead.id },
          data: {
            stage: "QUALIFIED",
            intentScore: 1.0,
          },
        });

        // Mark enrollment as completed
        if (enrollment) {
          await db.sequenceEnrollment.update({
            where: { id: enrollment.id },
            data: { status: "COMPLETED", completedAt: new Date() },
          });
        }
        break;
      }

      case "subscriber.unsubscribed": {
        // Record UNSUBSCRIBED event
        await db.analyticsEvent.create({
          data: {
            leadId: lead.id,
            type: "UNSUBSCRIBED",
            metadata: {
              campaignId: event.data.campaign?.id,
              enrollmentId: enrollment?.id,
            },
          },
        });

        // Update lead stage
        await db.lead.update({
          where: { id: lead.id },
          data: {
            stage: "UNSUBSCRIBED",
            unsubscribedAt: new Date(),
          } as any,
        });

        // Cancel active enrollments
        await db.sequenceEnrollment.updateMany({
          where: {
            leadId: lead.id,
            status: "ACTIVE",
          },
          data: { status: "CANCELLED" },
        });
        break;
      }

      case "subscriber.bounced": {
        // Record BOUNCED event
        await db.analyticsEvent.create({
          data: {
            leadId: lead.id,
            type: "BOUNCED",
            metadata: {
              campaignId: event.data.campaign?.id,
              enrollmentId: enrollment?.id,
            },
          },
        });

        // Update lead stage
        await db.lead.update({
          where: { id: lead.id },
          data: {
            stage: "UNSUBSCRIBED",
          },
        });
        break;
      }

      default:
        console.log(`[Webhook] Unhandled event type: ${event.event}`);
    }

    // Always return 200 to prevent Listmonk from retrying
    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("[Webhook] Error processing webhook:", error);
    // Still return 200 to prevent retries
    return NextResponse.json({ received: true, error: "Processing error" });
  }
}
