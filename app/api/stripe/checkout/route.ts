// Stripe Checkout API - $5/mo + Token Packs
// POST /api/stripe/checkout

import { NextRequest, NextResponse } from "next/server";
import { auth, currentUser } from "@clerk/nextjs/server";
import {
  getOrCreateStripeCustomer,
  createCheckoutSession,
  createTokenCheckoutSession,
  STRIPE_PRICES,
  PLANS,
  TOKEN_PACKAGES,
} from "@/services/stripe";

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await currentUser();
    const email = user?.emailAddresses?.[0]?.emailAddress;
    const name = user?.firstName ? `${user.firstName} ${user.lastName || ""}`.trim() : undefined;

    if (!email) {
      return NextResponse.json({ error: "Email required" }, { status: 400 });
    }

    const body = await req.json();
    const { plan, billingPeriod = "monthly", tokens } = body;

    // Get or create Stripe customer
    const customerId = await getOrCreateStripeCustomer(userId, email, name);

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://pulselifeos.com";
    const successUrl = `${baseUrl}/settings/billing?success=true`;
    const cancelUrl = `${baseUrl}/settings/billing?cancelled=true`;

    // Handle token purchase
    if (tokens) {
      const tokenPackage = TOKEN_PACKAGES[tokens as keyof typeof TOKEN_PACKAGES];
      if (!tokenPackage || !tokenPackage.priceId) {
        return NextResponse.json({ error: "Invalid token package" }, { status: 400 });
      }

      const session = await createTokenCheckoutSession(
        customerId,
        tokenPackage.priceId,
        `${successUrl}&tokens=${tokenPackage.tokens}`,
        cancelUrl,
        {
          userId,
          type: "tokens",
          tokens: tokenPackage.tokens.toString(),
        }
      );

      return NextResponse.json({ url: session.url });
    }

    // Handle subscription (only "plus" plan now)
    if (plan !== "plus") {
      return NextResponse.json({ error: "Invalid plan" }, { status: 400 });
    }

    const planConfig = PLANS.plus;
    const priceId = billingPeriod === "yearly"
      ? planConfig.priceId.yearly
      : planConfig.priceId.monthly;

    if (!priceId) {
      return NextResponse.json({ error: "Price not configured. Please set up Stripe products first." }, { status: 400 });
    }

    const session = await createCheckoutSession(
      customerId,
      priceId,
      successUrl,
      cancelUrl,
      {
        userId,
        plan: "plus",
        billingPeriod,
      }
    );

    return NextResponse.json({ url: session.url });

  } catch (err: any) {
    console.error("Checkout error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
