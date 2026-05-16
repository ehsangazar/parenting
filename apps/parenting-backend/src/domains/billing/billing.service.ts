import Stripe from "stripe";
import { env } from "../../config/env.js";
import * as repo from "./billing.repository.js";

function getStripe(): Stripe {
  if (!env.STRIPE_SECRET_KEY) throw new Error("STRIPE_SECRET_KEY is not configured");
  return new Stripe(env.STRIPE_SECRET_KEY, { apiVersion: "2023-10-16" });
}

const APP_URL = env.APP_URL ?? "http://localhost:5173";

export async function createCheckoutSession(
  userId: string,
  priceId: string,
  tenantId?: string,
): Promise<{ url: string | null }> {
  const stripe = getStripe();

  const user = await repo.findUserById(userId);
  const resolvedTenantId = tenantId ?? user?.tenantId ?? undefined;

  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    line_items: [{ price: priceId, quantity: 1 }],
    customer_email: user?.email ?? undefined,
    success_url: `${APP_URL}/app/settings`,
    cancel_url: `${APP_URL}/app/settings`,
    metadata: { tenantId: resolvedTenantId ?? "" },
  });

  return { url: session.url };
}

export async function createPortalSession(
  userId: string,
): Promise<{ url: string }> {
  const stripe = getStripe();

  const subscription = await repo.findSubscriptionByUserId(userId);
  if (!subscription?.stripeCustomerId) {
    throw Object.assign(new Error("No subscription found"), { statusCode: 400 });
  }

  const session = await stripe.billingPortal.sessions.create({
    customer: subscription.stripeCustomerId,
    return_url: `${APP_URL}/app`,
  });

  return { url: session.url };
}
