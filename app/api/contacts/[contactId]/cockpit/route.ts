// Contact Relationship Cockpit API
// app/api/contacts/[contactId]/cockpit/route.ts

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { supabaseAdmin } from "@/lib/supabase";
import { generateNextBestAction } from "@/lib/influence/engine";

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

    // 1. Load contact
    const { data: contact } = await supabaseAdmin
      .from("contacts")
      .select("*")
      .eq("id", contactId)
      .eq("user_id", dbUserId)
      .single();

    if (!contact) {
      return NextResponse.json({ error: "Contact not found" }, { status: 404 });
    }

    // 2. Load relationship scores
    const { data: relationshipScores } = await supabaseAdmin
      .from("contact_relationship_scores")
      .select("*")
      .eq("user_id", dbUserId)
      .eq("contact_id", contactId)
      .single();

    // 3. Load behavior profile
    const { data: behaviorProfile } = await supabaseAdmin
      .from("contact_behavior_profiles")
      .select("*")
      .eq("user_id", dbUserId)
      .eq("contact_id", contactId)
      .single();

    // 4. Load identity intel
    const { data: identityIntel } = await supabaseAdmin
      .from("contact_identity_intel")
      .select("*")
      .eq("user_id", dbUserId)
      .eq("contact_id", contactId)
      .single();

    // 5. Load playbook
    const { data: playbook } = await supabaseAdmin
      .from("contact_playbooks")
      .select("*")
      .eq("user_id", dbUserId)
      .eq("contact_id", contactId)
      .single();

    // 6. Load recent interactions (last 30)
    const { data: interactionEvents } = await supabaseAdmin
      .from("contact_interaction_events")
      .select("*, comm_messages(id, body, subject, source_type)")
      .eq("user_id", dbUserId)
      .eq("contact_id", contactId)
      .order("occurred_at", { ascending: false })
      .limit(30);

    // Map to recentInteractions format
    const recentInteractions = (interactionEvents || []).map((event) => {
      const msg = event.comm_messages || {};
      const snippet =
        msg.body || msg.subject || event.transcript_segment || "No content";
      return {
        id: event.id,
        channel: event.channel_type as "email" | "sms" | "call" | "audio",
        direction: event.direction as "incoming" | "outgoing",
        occurred_at: event.occurred_at,
        snippet: snippet.substring(0, 100),
        sentiment: event.sentiment,
        emotion_label: event.emotion_label,
        has_responsibilities: event.contains_promise || false,
        has_promises: event.contains_promise || false,
      };
    });

    // 7. Load open tasks
    const { data: tasks } = await supabaseAdmin
      .from("email_tasks")
      .select("id, title, due_at, status, comm_messages(source_type)")
      .eq("user_id", dbUserId)
      .in("status", ["open", "in_progress", "suggested"])
      .limit(20);

    // Filter tasks related to this contact (simplified - would need better linking)
    const contactTasks = (tasks || []).slice(0, 10).map((task) => ({
      id: task.id,
      title: task.title,
      due_at: task.due_at,
      status: task.status,
      source_channel: (task.comm_messages as any)?.source_type || "email",
    }));

    // 8. Load open promises
    const { data: promises } = await supabaseAdmin
      .from("email_promises")
      .select("id, promise_text, promise_due_at, status, comm_messages(source_type)")
      .eq("user_id", dbUserId)
      .eq("status", "open")
      .limit(20);

    const contactPromises = (promises || []).slice(0, 10).map((promise) => ({
      id: promise.id,
      description: promise.promise_text,
      promise_due_at: promise.promise_due_at,
      status: promise.status,
      source_channel: (promise.comm_messages as any)?.source_type || "email",
    }));

    // 9. Generate next best action (optional)
    let nextBestAction = null;
    try {
      const action = await generateNextBestAction({
        userId,
        contactId,
      });
      nextBestAction = action;
    } catch (err) {
      console.warn("[ContactCockpit] Failed to generate next best action:", err);
    }

    return NextResponse.json({
      contact: {
        id: contact.id,
        name: contact.name,
        email: contact.email,
        phone: contact.phone,
        company: contact.company,
        title: contact.title,
        primary_channel: behaviorProfile?.prefers_channel || null,
        vip_level: contact.vip_level || null,
        notes_short: contact.notes?.substring(0, 200) || null,
      },
      relationshipScores: relationshipScores
        ? {
            familiarity_score: relationshipScores.familiarity_score,
            trust_score: relationshipScores.trust_score,
            warmth_score: relationshipScores.warmth_score,
            influence_score: relationshipScores.influence_score,
            power_balance_score: relationshipScores.power_balance_score,
          }
        : undefined,
      behaviorProfile: behaviorProfile
        ? {
            prefers_channel: behaviorProfile.prefers_channel,
            escalation_channel: behaviorProfile.escalation_channel,
            avg_response_minutes: behaviorProfile.avg_response_minutes,
            their_avg_response_minutes: behaviorProfile.their_avg_response_minutes,
            reliability_score: behaviorProfile.reliability_score,
            risk_score: behaviorProfile.risk_score,
            conflict_sensitivity: behaviorProfile.conflict_sensitivity,
            brevity_preference: behaviorProfile.brevity_preference,
            formality_preference: behaviorProfile.formality_preference,
            directness_preference: behaviorProfile.directness_preference,
          }
        : undefined,
      identityIntel: identityIntel
        ? {
            summarised_identity: identityIntel.summarised_identity,
            inferred_personality: identityIntel.inferred_personality,
            inferred_values: identityIntel.inferred_values,
            inferred_drivers: identityIntel.inferred_drivers,
            inferred_communication_style: identityIntel.inferred_communication_style,
            last_refreshed: identityIntel.last_refreshed,
          }
        : undefined,
      playbook: playbook
        ? {
            summary: playbook.summary,
            doList: playbook.do_list || [],
            dontList: playbook.dont_list || [],
            channelGuidelines: playbook.channel_guidelines,
            toneGuidelines: playbook.tone_guidelines,
            conflictStrategy: playbook.conflict_strategy,
            persuasionLevers: playbook.persuasion_levers,
            generated_at: playbook.generated_at,
          }
        : null,
      recentInteractions,
      openItems: {
        tasks: contactTasks,
        promises: contactPromises,
      },
      nextBestAction,
    });
  } catch (err: any) {
    console.error("[ContactCockpit] Error:", err);
    return NextResponse.json(
      { error: err.message || "Failed to load contact cockpit" },
      { status: 500 }
    );
  }
}

