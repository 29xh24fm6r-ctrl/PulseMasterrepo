// Stripe Configuration - $5/mo + Token Packs Model
// lib/stripe.ts

import type Stripe from "stripe";

// NOTE: We do NOT import "stripe" or "@/lib/supabase" at the top level
// to prevent build-time execution of SDKs.

/**
 * Async accessor for Stripe client
 * Safe for use in Next.js build phase (because it won't be called)
 */
export async function getStripe(): Promise<Stripe> {
  // Dynamic import acts as a runtime barrier
  const { getStripeRuntime } = await import("@/lib/runtime/stripe.runtime");
  return getStripeRuntime();
}

// Price IDs - Set these in your environment variables after creating products in Stripe
// These are safe to read at module time as long as they don't throw,
// but be aware Next.js might bake values at build time if this file is imported.
export const STRIPE_PRICES = {
  plus_monthly: process.env.STRIPE_PRICE_PLUS_MONTHLY || "",
  plus_yearly: process.env.STRIPE_PRICE_PLUS_YEARLY || "",
  tokens_100: process.env.STRIPE_PRICE_TOKENS_500 || "",
  tokens_220: process.env.STRIPE_PRICE_TOKENS_1200 || "",
  tokens_600: process.env.STRIPE_PRICE_TOKENS_3500 || "",
  tokens_1400: process.env.STRIPE_PRICE_TOKENS_8000 || "",
  tokens_1000: process.env.STRIPE_PRICE_TOKENS_1000 || "", // Added robustness
};

// Plan configuration
export const PLANS = {
  free: {
    name: "Free",
    description: "Get started with Pulse",
    monthlyPrice: 0,
    yearlyPrice: 0,
    features: [
      "10 AI interactions/day",
      "Basic task management",
      "Habit tracking",
      "Journal",
    ],
    limits: {
      aiCallsPerDay: 10,
      monthlyCredits: 100, // Very limited free tier
      voiceMinutesPerMonth: 0,
    },
  },
  plus: {
    name: "Pulse+",
    description: "Full access to your AI life operating system",
    monthlyPrice: 5,
    yearlyPrice: 50, // ~$4.17/mo - 2 months free
    priceId: {
      monthly: STRIPE_PRICES.plus_monthly,
      yearly: STRIPE_PRICES.plus_yearly,
    },
    features: [
      "1,000 tokens/month included",
      "Full Life Dashboard",
      "Work Mode & Focus Timer",
      "Philosophy Dojo",
      "Identity Engine",
      "Voice features",
      "Deal & Contact Intelligence",
      "Unlimited feature access",
      "Priority support",
    ],
    limits: {
      aiCallsPerDay: -1, // Unlimited, constrained by tokens
      monthlyCredits: 300, // 300 tokens = $3 cost cap
      voiceMinutesPerMonth: 30,
    },
  },
};

// Token packages (1 token ≈ 1 cent of AI cost)
export const TOKEN_PACKAGES = {
  starter: {
    name: "Starter",
    tokens: 100,
    price: 5,
    priceId: STRIPE_PRICES.tokens_100,
    perToken: "$0.05",
  },
  standard: {
    name: "Standard",
    tokens: 220,
    price: 10,
    priceId: STRIPE_PRICES.tokens_220,
    perToken: "$0.045",
    savings: "10% off",
  },
  power: {
    name: "Power",
    tokens: 600,
    price: 25,
    priceId: STRIPE_PRICES.tokens_600,
    perToken: "$0.042",
    savings: "16% off",
  },
  ultimate: {
    name: "Ultimate",
    tokens: 1400,
    price: 50,
    priceId: STRIPE_PRICES.tokens_1400,
    perToken: "$0.036",
    savings: "28% off",
  },
};

/**
 * Get or create a Stripe customer for a user
 */
export async function getOrCreateStripeCustomer(
  userId: string,
  email: string,
  name?: string
): Promise<string> {
  // Dynamic import for Supabase to avoid build-time execution
  const { supabaseAdmin } = await import("@/lib/supabase");
  const stripe = await getStripe();

  // Check if user already has a Stripe customer ID
  const { data: profile } = await supabaseAdmin
    .from("user_profiles")
    .select("stripe_customer_id")
    .eq("user_id", userId)
    .single();

  if (profile?.stripe_customer_id) {
    return profile.stripe_customer_id;
  }

  // Create new Stripe customer
  const customer = await stripe.customers.create({
    email,
    name,
    metadata: {
      userId,
    },
  });

  // Save to profile
  await supabaseAdmin
    .from("user_profiles")
    .update({ stripe_customer_id: customer.id })
    .eq("user_id", userId);

  return customer.id;
}

/**
 * Create a checkout session for subscription
 */
export async function createCheckoutSession(
  customerId: string,
  priceId: string,
  successUrl: string,
  cancelUrl: string,
  metadata?: Record<string, string>
): Promise<Stripe.Checkout.Session> {
  const stripe = await getStripe();
  return stripe.checkout.sessions.create({
    customer: customerId,
    mode: "subscription",
    payment_method_types: ["card"],
    line_items: [
      {
        price: priceId,
        quantity: 1,
      },
    ],
    success_url: successUrl,
    cancel_url: cancelUrl,
    metadata,
    subscription_data: {
      metadata,
    },
    allow_promotion_codes: true,
  });
}

/**
 * Create a checkout session for one-time token purchase
 */
export async function createTokenCheckoutSession(
  customerId: string,
  priceId: string,
  successUrl: string,
  cancelUrl: string,
  metadata?: Record<string, string>
): Promise<Stripe.Checkout.Session> {
  const stripe = await getStripe();
  return stripe.checkout.sessions.create({
    customer: customerId,
    mode: "payment",
    payment_method_types: ["card"],
    line_items: [
      {
        price: priceId,
        quantity: 1,
      },
    ],
    success_url: successUrl,
    cancel_url: cancelUrl,
    metadata,
  });
}

/**
 * Create a billing portal session
 */
export async function createBillingPortalSession(
  customerId: string,
  returnUrl: string
): Promise<Stripe.BillingPortal.Session> {
  const stripe = await getStripe();
  return stripe.billingPortal.sessions.create({
    customer: customerId,
    return_url: returnUrl,
  });
}

/**
 * Cancel a subscription
 */
export async function cancelSubscription(
  subscriptionId: string,
  immediately: boolean = false
): Promise<Stripe.Subscription> {
  const stripe = await getStripe();
  if (immediately) {
    return stripe.subscriptions.cancel(subscriptionId);
  }

  // Cancel at period end
  return stripe.subscriptions.update(subscriptionId, {
    cancel_at_period_end: true,
  });
}

/**
 * Resume a cancelled subscription
 */
export async function resumeSubscription(
  subscriptionId: string
): Promise<Stripe.Subscription> {
  const stripe = await getStripe();
  return stripe.subscriptions.update(subscriptionId, {
    cancel_at_period_end: false,
  });
}

/**
 * Get subscription details
 */
export async function getSubscription(
  subscriptionId: string
): Promise<Stripe.Subscription> {
  const stripe = await getStripe();
  return stripe.subscriptions.retrieve(subscriptionId);
}

/**
 * Map Stripe subscription status to our status
 */
export function mapSubscriptionStatus(
  stripeStatus: Stripe.Subscription.Status
): string {
  const statusMap: Record<string, string> = {
    active: "active",
    past_due: "past_due",
    canceled: "cancelled",
    incomplete: "incomplete",
    incomplete_expired: "expired",
    trialing: "trialing",
    unpaid: "unpaid",
    paused: "paused",
    paused_incomplete: "paused",
  };

  return statusMap[stripeStatus] || stripeStatus;
}

/**
 * Get plan from price ID
 */
export function getPlanFromPriceId(priceId: string): "plus" | "free" {
  if (
    priceId === STRIPE_PRICES.plus_monthly ||
    priceId === STRIPE_PRICES.plus_yearly
  ) {
    return "plus";
  }
  return "free";
}

/**
 * Get tokens from price ID
 */
export function getTokensFromPriceId(priceId: string): number {
  if (priceId === STRIPE_PRICES.tokens_100) return 100;
  if (priceId === STRIPE_PRICES.tokens_220) return 220;
  if (priceId === STRIPE_PRICES.tokens_600) return 600;
  if (priceId === STRIPE_PRICES.tokens_1400) return 1400;
  return 0;
}
