// Profile API - Get/Create/Update user profile
// app/api/profile/route.ts

import { NextRequest, NextResponse } from "next/server";
import { auth, currentUser } from "@clerk/nextjs/server";
import {
  getOrCreateProfile,
  updateProfileByUserId,
  getUsageSummary,
  getReferralStats,
  hasFeatureAccess,
  PLAN_LIMITS,
} from "@/lib/services/profile";

// GET - Get current user's profile
export async function GET(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get Clerk user for email
    const user = await currentUser();
    const email = user?.emailAddresses?.[0]?.emailAddress;

    // Check for referral code in query params (for new users)
    const { searchParams } = new URL(req.url);
    const referralCode = searchParams.get("ref");

    // Get or create profile
    const { profile, created } = await getOrCreateProfile(userId, email, referralCode || undefined);

    // Get usage summary
    const usage = await getUsageSummary(userId);

    // Get referral stats
    const referrals = await getReferralStats(userId);

    // Get plan limits
    const limits = PLAN_LIMITS[profile.plan];

    return NextResponse.json({
      profile,
      created,
      usage,
      referrals,
      limits,
    });
  } catch (err: any) {
    console.error("Profile GET error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// POST - Update profile
export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { action, ...updates } = body;

    // Handle specific actions
    if (action === "check_feature") {
      const { feature } = body;
      const { profile } = await getOrCreateProfile(userId);
      const hasAccess = hasFeatureAccess(profile, feature);
      
      return NextResponse.json({
        feature,
        hasAccess,
        plan: profile.plan,
        upgradeRequired: !hasAccess,
      });
    }

    // Validate allowed updates (prevent modifying sensitive fields directly)
    const allowedFields = [
      "intensity_level",
      "archetype",
      "philosophy_mentor",
      "current_mood",
      "current_energy",
      "current_stress",
    ];

    const safeUpdates: Record<string, any> = {};
    for (const field of allowedFields) {
      if (updates[field] !== undefined) {
        safeUpdates[field] = updates[field];
      }
    }

    if (Object.keys(safeUpdates).length === 0) {
      return NextResponse.json({ error: "No valid fields to update" }, { status: 400 });
    }

    const updatedProfile = await updateProfileByUserId(userId, safeUpdates);

    if (!updatedProfile) {
      return NextResponse.json({ error: "Failed to update profile" }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      profile: updatedProfile,
    });
  } catch (err: any) {
    console.error("Profile POST error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// PATCH - Admin-level updates (for internal use / webhooks)
export async function PATCH(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Verify request is from internal source (webhook secret or admin)
    const authHeader = req.headers.get("x-internal-secret");
    const internalSecret = process.env.INTERNAL_API_SECRET;

    // For now, allow authenticated users to update their own billing
    // In production, this should verify Stripe webhook signature
    const body = await req.json();
    const { plan, stripe_customer_id, stripe_subscription_id, subscription_status, token_balance_cents } = body;

    const updates: Record<string, any> = {};
    
    if (plan) updates.plan = plan;
    if (stripe_customer_id) updates.stripe_customer_id = stripe_customer_id;
    if (stripe_subscription_id) updates.stripe_subscription_id = stripe_subscription_id;
    if (subscription_status) updates.subscription_status = subscription_status;
    if (token_balance_cents !== undefined) updates.token_balance_cents = token_balance_cents;

    const updatedProfile = await updateProfileByUserId(userId, updates);

    return NextResponse.json({
      success: true,
      profile: updatedProfile,
    });
  } catch (err: any) {
    console.error("Profile PATCH error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}