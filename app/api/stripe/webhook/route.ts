// Stripe Webhook Handler - $5/mo + Token Packs
// POST /api/stripe/webhook

import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import Stripe from "stripe";
import {
  stripe,
  getPlanFromPriceId,
  getTokensFromPriceId,
  mapSubscriptionStatus,
} from "@/lib/stripe";
import { supabaseAdmin } from "@/lib/supabase";

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

export async function POST(req: NextRequest) {
  try {
    const body = await req.text();
    const headersList = await headers();
    const signature = headersList.get("stripe-signature");

    if (!signature || !webhookSecret) {
      console.error("Missing signature or webhook secret");
      return NextResponse.json({ error: "Missing signature" }, { status: 400 });
    }

    let event: Stripe.Event;

    try {
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
    } catch (err: any) {
      console.error("Webhook signature verification failed:", err.message);
      return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
    }

    console.log(`🔔 Stripe webhook: ${event.type}`);

    switch (event.type) {
      // Checkout completed - new subscription or token purchase
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        await handleCheckoutComplete(session);
        break;
      }

      // Subscription created
      case "customer.subscription.created": {
        const subscription = event.data.object as Stripe.Subscription;
        await handleSubscriptionChange(subscription, "created");
        break;
      }

      // Subscription updated (plan change, renewal, etc)
      case "customer.subscription.updated": {
        const subscription = event.data.object as Stripe.Subscription;
        await handleSubscriptionChange(subscription, "updated");
        break;
      }

      // Subscription cancelled
      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        await handleSubscriptionCancelled(subscription);
        break;
      }

      // Payment succeeded (for tokens or subscription renewal)
      case "invoice.payment_succeeded": {
        const invoice = event.data.object as Stripe.Invoice;
        await handleInvoicePaid(invoice);
        break;
      }

      // Payment failed
      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        await handlePaymentFailed(invoice);
        break;
      }

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return NextResponse.json({ received: true });

  } catch (err: any) {
    console.error("Webhook error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

/**
 * Handle checkout session completed
 */
async function handleCheckoutComplete(session: Stripe.Checkout.Session) {
  const userId = session.metadata?.userId;
  const type = session.metadata?.type;

  if (!userId) {
    console.error("No userId in checkout metadata");
    return;
  }

  console.log(`✅ Checkout complete for user ${userId}, type: ${type || "subscription"}`);

  // Handle token purchase
  if (type === "tokens") {
    const tokens = parseInt(session.metadata?.tokens || "0", 10);
    if (tokens > 0) {
      await addTokensToUser(userId, tokens);
    }
    return;
  }

  // Subscription is handled by subscription.created event
}

/**
 * Handle subscription changes
 */
async function handleSubscriptionChange(
  subscription: Stripe.Subscription,
  eventType: "created" | "updated"
) {
  const customerId = subscription.customer as string;
  
  // Get user by Stripe customer ID
  const { data: profile } = await supabaseAdmin
    .from("user_profiles")
    .select("user_id")
    .eq("stripe_customer_id", customerId)
    .single();

  if (!profile) {
    console.error(`No user found for Stripe customer: ${customerId}`);
    return;
  }

  const userId = profile.user_id;
  
  // Get plan from price ID
  const priceId = subscription.items.data[0]?.price.id;
  const plan = getPlanFromPriceId(priceId);
  const status = mapSubscriptionStatus(subscription.status);

  console.log(`📦 Subscription ${eventType}: user=${userId}, plan=${plan}, status=${status}`);

  // Update user profile
  await supabaseAdmin
    .from("user_profiles")
    .update({
      plan,
      stripe_subscription_id: subscription.id,
      subscription_status: status,
      trial_ends_at: subscription.trial_end
        ? new Date(subscription.trial_end * 1000).toISOString()
        : null,
      refund_eligible_at: eventType === "created"
        ? new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
        : undefined,
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", userId);

  // Award referral bonus if this is a new paid subscription
  if (eventType === "created" && plan === "plus") {
    await creditReferralBonus(userId);
  }
}

/**
 * Handle subscription cancelled
 */
async function handleSubscriptionCancelled(subscription: Stripe.Subscription) {
  const customerId = subscription.customer as string;

  const { data: profile } = await supabaseAdmin
    .from("user_profiles")
    .select("user_id")
    .eq("stripe_customer_id", customerId)
    .single();

  if (!profile) {
    console.error(`No user found for Stripe customer: ${customerId}`);
    return;
  }

  console.log(`❌ Subscription cancelled for user: ${profile.user_id}`);

  // Downgrade to free
  await supabaseAdmin
    .from("user_profiles")
    .update({
      plan: "free",
      subscription_status: "cancelled",
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", profile.user_id);
}

/**
 * Handle invoice payment succeeded
 */
async function handleInvoicePaid(invoice: Stripe.Invoice) {
  const customerId = invoice.customer as string;

  console.log(`💰 Invoice paid: ${invoice.id} for customer ${customerId}`);

  // Reset monthly usage on successful renewal
  if (invoice.billing_reason === "subscription_cycle") {
    const { data: profile } = await supabaseAdmin
      .from("user_profiles")
      .select("user_id")
      .eq("stripe_customer_id", customerId)
      .single();

    if (profile) {
      await supabaseAdmin
        .from("user_profiles")
        .update({
          usage_cents_this_month: 0,
          usage_reset_at: new Date().toISOString(),
        })
        .eq("user_id", profile.user_id);

      console.log(`🔄 Reset monthly usage for user: ${profile.user_id}`);
    }
  }
}

/**
 * Handle payment failed
 */
async function handlePaymentFailed(invoice: Stripe.Invoice) {
  const customerId = invoice.customer as string;

  console.log(`❗ Payment failed: ${invoice.id} for customer ${customerId}`);

  const { data: profile } = await supabaseAdmin
    .from("user_profiles")
    .select("user_id")
    .eq("stripe_customer_id", customerId)
    .single();

  if (profile) {
    await supabaseAdmin
      .from("user_profiles")
      .update({
        subscription_status: "past_due",
        updated_at: new Date().toISOString(),
      })
      .eq("user_id", profile.user_id);
  }

  // TODO: Send email notification about failed payment
}

/**
 * Add tokens to user's balance
 */
async function addTokensToUser(userId: string, tokens: number) {
  const { data: profile } = await supabaseAdmin
    .from("user_profiles")
    .select("token_balance_cents")
    .eq("user_id", userId)
    .single();

  const currentBalance = profile?.token_balance_cents || 0;
  const newBalance = currentBalance + tokens;

  await supabaseAdmin
    .from("user_profiles")
    .update({
      token_balance_cents: newBalance,
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", userId);

  // Log the transaction
  await supabaseAdmin.from("xp_transactions").insert({
    user_id: userId,
    amount: 0, // No XP for purchases
    source: "token_purchase",
    description: `Purchased ${tokens} tokens`,
    metadata: { tokens },
  });

  console.log(`💳 Added ${tokens} tokens to user ${userId}. New balance: ${newBalance}`);
}

/**
 * Credit referral bonus when referred user upgrades
 */
async function creditReferralBonus(userId: string) {
  // Check if user was referred
  const { data: profile } = await supabaseAdmin
    .from("user_profiles")
    .select("referred_by")
    .eq("user_id", userId)
    .single();

  if (!profile?.referred_by) {
    return;
  }

  // Check for pending referral reward
  const { data: reward } = await supabaseAdmin
    .from("referral_rewards")
    .select("*")
    .eq("referred_user_id", userId)
    .eq("status", "pending")
    .single();

  if (!reward) {
    return;
  }

  // Credit the referrer with tokens (500 tokens = $5 value)
  const referralTokens = 500;
  
  const { data: referrerProfile } = await supabaseAdmin
    .from("user_profiles")
    .select("token_balance_cents")
    .eq("user_id", profile.referred_by)
    .single();

  const currentBalance = referrerProfile?.token_balance_cents || 0;
  const newBalance = currentBalance + referralTokens;

  await supabaseAdmin
    .from("user_profiles")
    .update({
      token_balance_cents: newBalance,
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", profile.referred_by);

  // Also give the new user bonus tokens
  const { data: newUserProfile } = await supabaseAdmin
    .from("user_profiles")
    .select("token_balance_cents")
    .eq("user_id", userId)
    .single();

  await supabaseAdmin
    .from("user_profiles")
    .update({
      token_balance_cents: (newUserProfile?.token_balance_cents || 0) + referralTokens,
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", userId);

  // Mark reward as credited
  await supabaseAdmin
    .from("referral_rewards")
    .update({
      status: "credited",
      reward_cents: referralTokens, // Store as tokens now
      credited_at: new Date().toISOString(),
    })
    .eq("id", reward.id);

  console.log(`🎁 Credited referral bonus: ${referralTokens} tokens to user ${profile.referred_by} and ${userId}`);
}