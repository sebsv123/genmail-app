import { NextRequest, NextResponse } from "next/server";
import { stripe, constructStripeEvent } from "@/lib/stripe";
import { db } from "@/lib/db";
import { UserPlan } from "@genmail/db";
import Stripe from "stripe";

// Map Stripe plan to internal plan
function getPlanFromPriceId(priceId: string): UserPlan {
  const priceMap: Record<string, UserPlan> = {
    [process.env.STRIPE_PRICE_STARTER || "price_starter"]: "STARTER",
    [process.env.STRIPE_PRICE_PRO || "price_pro"]: "PRO",
    [process.env.STRIPE_PRICE_AGENCY || "price_agency"]: "AGENCY",
  };
  return priceMap[priceId] || "FREE";
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.text();
    const signature = req.headers.get("stripe-signature");

    if (!signature) {
      return NextResponse.json({ error: "No signature" }, { status: 400 });
    }

    const event = await constructStripeEvent(body, signature);

    console.log(`[Stripe Webhook] Received event: ${event.type}`);

    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const businessId = session.metadata?.businessId;

        if (!businessId) {
          console.error("[Stripe Webhook] No businessId in session metadata");
          break;
        }

        // Get subscription details
        const subscriptionId = session.subscription as string;
        const stripeSubscription = await stripe.subscriptions.retrieve(subscriptionId);
        const priceId = stripeSubscription.items.data[0]?.price.id;
        const plan = getPlanFromPriceId(priceId);

        // Create or update subscription
        await db.subscription.upsert({
          where: { businessId },
          create: {
            businessId,
            stripeCustomerId: session.customer as string,
            stripeSubscriptionId: subscriptionId,
            stripePriceId: priceId,
            plan,
            status: stripeSubscription.status as any,
            currentPeriodStart: new Date(stripeSubscription.current_period_start * 1000),
            currentPeriodEnd: new Date(stripeSubscription.current_period_end * 1000),
            trialEndsAt: stripeSubscription.trial_end
              ? new Date(stripeSubscription.trial_end * 1000)
              : null,
          },
          update: {
            stripeSubscriptionId: subscriptionId,
            stripePriceId: priceId,
            plan,
            status: stripeSubscription.status as any,
            currentPeriodStart: new Date(stripeSubscription.current_period_start * 1000),
            currentPeriodEnd: new Date(stripeSubscription.current_period_end * 1000),
            trialEndsAt: stripeSubscription.trial_end
              ? new Date(stripeSubscription.trial_end * 1000)
              : null,
          },
        });

        // Update business and user plan
        await db.business.update({
          where: { id: businessId },
          data: {},
        });

        await db.user.updateMany({
          where: { businessId },
          data: { plan },
        });

        console.log(`[Stripe Webhook] Subscription created for business ${businessId}`);
        break;
      }

      case "customer.subscription.updated": {
        const subscription = event.data.object as Stripe.Subscription;
        const businessId = subscription.metadata?.businessId;

        if (!businessId) {
          // Try to find by subscription ID
          const existingSub = await db.subscription.findUnique({
            where: { stripeSubscriptionId: subscription.id },
          });
          if (existingSub) {
            await db.subscription.update({
              where: { id: existingSub.id },
              data: {
                status: subscription.status as any,
                currentPeriodEnd: new Date(subscription.current_period_end * 1000),
                cancelAtPeriodEnd: subscription.cancel_at_period_end,
              },
            });
          }
        } else {
          const priceId = subscription.items.data[0]?.price.id;
          const newPlan = getPlanFromPriceId(priceId);

          await db.subscription.update({
            where: { businessId },
            data: {
              status: subscription.status as any,
              currentPeriodEnd: new Date(subscription.current_period_end * 1000),
              cancelAtPeriodEnd: subscription.cancel_at_period_end,
              plan: newPlan,
            },
          });

          // Update user plan if changed
          await db.user.updateMany({
            where: { businessId },
            data: { plan: newPlan },
          });
        }

        console.log(`[Stripe Webhook] Subscription updated: ${subscription.id}`);
        break;
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;

        const existingSub = await db.subscription.findUnique({
          where: { stripeSubscriptionId: subscription.id },
        });

        if (existingSub) {
          await db.subscription.update({
            where: { id: existingSub.id },
            data: {
              status: "CANCELED",
              plan: "FREE",
            },
          });

          // Downgrade users to FREE
          await db.user.updateMany({
            where: { businessId: existingSub.businessId },
            data: { plan: "FREE" },
          });

          console.log(`[Stripe Webhook] Subscription canceled: ${subscription.id}`);
        }
        break;
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        const subscriptionId = invoice.subscription as string;

        if (subscriptionId) {
          await db.subscription.updateMany({
            where: { stripeSubscriptionId: subscriptionId },
            data: { status: "PAST_DUE" },
          });
        }

        console.log(`[Stripe Webhook] Payment failed for invoice: ${invoice.id}`);
        break;
      }

      case "invoice.payment_succeeded": {
        const invoice = event.data.object as Stripe.Invoice;
        const subscriptionId = invoice.subscription as string;

        if (subscriptionId) {
          // Update status to ACTIVE if was past due
          await db.subscription.updateMany({
            where: { stripeSubscriptionId: subscriptionId },
            data: { status: "ACTIVE" },
          });

          // Reset usage record for new period
          const existingSub = await db.subscription.findUnique({
            where: { stripeSubscriptionId: subscriptionId },
          });

          if (existingSub) {
            const now = new Date();
            const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

            await db.usageRecord.upsert({
              where: {
                businessId_month: {
                  businessId: existingSub.businessId,
                  month,
                },
              },
              create: {
                businessId: existingSub.businessId,
                month,
                emailsSent: 0,
                leadsHunted: 0,
                activeLeads: 0,
              },
              update: {
                emailsSent: 0,
                leadsHunted: 0,
              },
            });
          }
        }

        console.log(`[Stripe Webhook] Payment succeeded for invoice: ${invoice.id}`);
        break;
      }

      default:
        console.log(`[Stripe Webhook] Unhandled event type: ${event.type}`);
    }

    // Always return 200 to prevent Stripe from retrying
    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("[Stripe Webhook] Error:", error);
    return NextResponse.json({ error: "Webhook processing failed" }, { status: 400 });
  }
}
