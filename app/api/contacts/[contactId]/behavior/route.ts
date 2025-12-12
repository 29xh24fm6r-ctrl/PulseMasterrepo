// Contact Behavior Profile API
// app/api/contacts/[contactId]/behavior/route.ts

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { supabaseAdmin } from "@/lib/supabase";
import { recomputeBehaviorProfileForContact, upsertBehaviorProfile } from "@/lib/contacts/behavior";

export async function GET(
  req: NextRequest,
  { params }: { params: { contactId: string } }
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get user's database ID
    const { data: userRow } = await supabaseAdmin
      .from("users")
      .select("id")
      .eq("clerk_id", userId)
      .single();

    const dbUserId = userRow?.id || userId;

    const contactId = params.contactId;

    // Check if profile exists
    const { data: existing } = await supabaseAdmin
      .from("contact_behavior_profiles")
      .select("*")
      .eq("user_id", dbUserId)
      .eq("contact_id", contactId)
      .single();

    // If exists and recent (< 24 hours), return it
    if (existing) {
      const age = Date.now() - new Date(existing.last_updated).getTime();
      const oneDay = 24 * 60 * 60 * 1000;
      if (age < oneDay) {
        return NextResponse.json({
          contactId,
          emailsSent: existing.emails_sent || 0,
          emailsReceived: existing.emails_received || 0,
          smsSent: existing.sms_sent || 0,
          smsReceived: existing.sms_received || 0,
          callsCount: existing.calls_count || 0,
          audioConversationsCount: existing.audio_conversations_count || 0,
          avgResponseMinutes: existing.avg_response_minutes,
          theirAvgResponseMinutes: existing.their_avg_response_minutes,
          prefersChannel: existing.prefers_channel,
          escalationChannel: existing.escalation_channel,
          conflictSensitivity: existing.conflict_sensitivity || 0.5,
          brevityPreference: existing.brevity_preference || 0.5,
          formalityPreference: existing.formality_preference || 0.5,
          directnessPreference: existing.directness_preference || 0.5,
          reliabilityScore: existing.reliability_score || 0.5,
          riskScore: existing.risk_score || 0.5,
        });
      }
    }

    // Recompute and return
    const profile = await recomputeBehaviorProfileForContact(userId, contactId);
    await upsertBehaviorProfile(userId, contactId, profile);

    return NextResponse.json(profile);
  } catch (err: any) {
    console.error("[ContactBehavior] Error:", err);
    return NextResponse.json(
      { error: err.message || "Failed to get contact behavior" },
      { status: 500 }
    );
  }
}

