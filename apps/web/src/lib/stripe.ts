import Stripe from "stripe";
import { db } from "./db";

let _stripe: Stripe | null = null;

/**
 * Lazy Stripe client. Only throws when Stripe is actually invoked.
 * This allows the web app to boot without STRIPE_SECRET_KEY (billing endpoints
 * will return 503 if accessed without a key).
 */
function getStripe(): Stripe {
  if (_stripe) return _stripe;
  const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
  if (!stripeSecretKey) {
    throw new Error(
      "STRIPE_SECRET_KEY is not set. Configure it in your .env to enable billing."
    );
  }
  _stripe = new Stripe(stripeSecretKey, {
    apiVersion: "2025-02-24.acacia" as any,
    typescript: true,
  });
  return _stripe;
}

// Export proxy that lazily initializes Stripe on first access
export const stripe = new Proxy({} as Stripe, {
  get(_target, prop) {
    const client = getStripe();
    const value = (client as any)[prop];
    return typeof value === "function" ? value.bind(client) : value;
  },
});

export interface CheckoutSessionParams {
  businessId: string;
  priceId: string;
  successUrl: string;
  cancelUrl: string;
}

export async function createCheckoutSession({
  businessId,
  priceId,
  successUrl,
  cancelUrl,
}: CheckoutSessionParams): Promise<string> {
  const business = await db.business.findUnique({
    where: { id: businessId },
    include: { subscription: true },
  });

  if (!business) {
    throw new Error("Business not found");
  }

  // Get or create Stripe customer
  const customerId = await createOrRetrieveCustomer(businessId);

  const session = await stripe.checkout.sessions.create({
    customer: customerId,
    line_items: [
      {
        price: priceId,
        quantity: 1,
      },
    ],
    mode: "subscription",
    subscription_data: {
      trial_period_days: 14,
    },
    allow_promotion_codes: true,
    success_url: successUrl,
    cancel_url: cancelUrl,
    metadata: {
      businessId,
    },
  });

  if (!session.url) {
    throw new Error("Failed to create checkout session");
  }

  return session.url;
}

export async function createBillingPortalSession(
  stripeCustomerId: string,
  returnUrl: string
): Promise<string> {
  const session = await stripe.billingPortal.sessions.create({
    customer: stripeCustomerId,
    return_url: returnUrl,
  });

  return session.url;
}

export async function createOrRetrieveCustomer(businessId: string): Promise<string> {
  const business = await db.business.findUnique({
    where: { id: businessId },
    include: {
      subscription: true,
      users: {
        where: { role: "OWNER" },
        take: 1,
      },
    },
  });

  if (!business) {
    throw new Error("Business not found");
  }

  // Return existing customer
  if (business.subscription?.stripeCustomerId) {
    return business.subscription.stripeCustomerId;
  }

  // Get owner email
  const owner = business.users[0];
  if (!owner) {
    throw new Error("No owner found for business");
  }

  // Create new customer
  const customer = await stripe.customers.create({
    email: owner.email,
    name: business.name,
    metadata: {
      businessId,
    },
  });

  // Create subscription record with customer ID
  await db.subscription.upsert({
    where: { businessId },
    create: {
      businessId,
      stripeCustomerId: customer.id,
      plan: "FREE",
      status: "INCOMPLETE",
      currentPeriodStart: new Date(),
      currentPeriodEnd: new Date(),
    },
    update: {
      stripeCustomerId: customer.id,
    },
  });

  return customer.id;
}

export async function getSubscriptionStatus(
  stripeSubscriptionId: string
): Promise<Stripe.Subscription.Status> {
  const subscription = await stripe.subscriptions.retrieve(stripeSubscriptionId);
  return subscription.status;
}

export async function constructStripeEvent(
  payload: string | Buffer,
  signature: string
): Promise<Stripe.Event> {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    throw new Error("STRIPE_WEBHOOK_SECRET is not set");
  }

  return stripe.webhooks.constructEvent(payload, signature, webhookSecret);
}
