// Contact Behavior Aggregation Engine
// lib/contacts/behavior.ts

import { supabaseAdmin } from "@/lib/supabase";

export interface ContactBehaviorProfile {
  contactId: string;
  emailsSent: number;
  emailsReceived: number;
  smsSent: number;
  smsReceived: number;
  callsCount: number;
  audioConversationsCount: number;
  avgResponseMinutes: number | null;
  theirAvgResponseMinutes: number | null;
  prefersChannel: string | null;
  escalationChannel: string | null;
  conflictSensitivity: number; // 0..1
  brevityPreference: number; // 0..1
  formalityPreference: number; // 0..1
  directnessPreference: number; // 0..1
  reliabilityScore: number; // 0..1
  riskScore: number; // 0..1
}

/**
 * Recompute behavior profile for a contact
 */
export async function recomputeBehaviorProfileForContact(
  userId: string,
  contactId: string
): Promise<ContactBehaviorProfile> {
  // Get user's database ID
  const { data: userRow } = await supabaseAdmin
    .from("users")
    .select("id")
    .eq("clerk_id", userId)
    .single();

  const dbUserId = userRow?.id || userId;

  // 1. Load interaction events for this contact
  const { data: events } = await supabaseAdmin
    .from("contact_interaction_events")
    .select("*")
    .eq("user_id", dbUserId)
    .eq("contact_id", contactId)
    .order("occurred_at", { ascending: false });

  if (!events || events.length === 0) {
    // Return default profile
    return {
      contactId,
      emailsSent: 0,
      emailsReceived: 0,
      smsSent: 0,
      smsReceived: 0,
      callsCount: 0,
      audioConversationsCount: 0,
      avgResponseMinutes: null,
      theirAvgResponseMinutes: null,
      prefersChannel: null,
      escalationChannel: null,
      conflictSensitivity: 0.5,
      brevityPreference: 0.5,
      formalityPreference: 0.5,
      directnessPreference: 0.5,
      reliabilityScore: 0.5,
      riskScore: 0.5,
    };
  }

  // 2. Aggregate counts by channel & direction
  let emailsSent = 0;
  let emailsReceived = 0;
  let smsSent = 0;
  let smsReceived = 0;
  let callsCount = 0;
  let audioConversationsCount = 0;

  const channelCounts: Record<string, number> = {};
  const responseTimes: number[] = [];
  const theirResponseTimes: number[] = [];
  let conflictEvents: number = 0;
  let negativeSentimentEvents: number = 0;
  let totalSentiment = 0;

  for (const event of events) {
    // Count by channel
    if (event.channel_type === "email") {
      if (event.direction === "outgoing") emailsSent++;
      else emailsReceived++;
    } else if (event.channel_type === "sms") {
      if (event.direction === "outgoing") smsSent++;
      else smsReceived++;
    } else if (event.channel_type === "call") {
      callsCount++;
    } else if (event.channel_type === "audio") {
      audioConversationsCount++;
    }

    channelCounts[event.channel_type] = (channelCounts[event.channel_type] || 0) + 1;

    // Response times
    if (event.response_time_minutes) {
      if (event.direction === "outgoing") {
        responseTimes.push(event.response_time_minutes);
      } else {
        theirResponseTimes.push(event.response_time_minutes);
      }
    }

    // Conflict and sentiment
    if (event.contains_conflict) {
      conflictEvents++;
    }
    if (event.sentiment && event.sentiment < -0.3) {
      negativeSentimentEvents++;
    }
    if (event.sentiment) {
      totalSentiment += event.sentiment;
    }
  }

  // 3. Compute response times
  const avgResponseMinutes =
    responseTimes.length > 0
      ? responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length
      : null;
  const theirAvgResponseMinutes =
    theirResponseTimes.length > 0
      ? theirResponseTimes.reduce((a, b) => a + b, 0) / theirResponseTimes.length
      : null;

  // 4. Determine prefers_channel (most frequent and most responsive)
  let prefersChannel: string | null = null;
  let maxChannelCount = 0;
  for (const [channel, count] of Object.entries(channelCounts)) {
    if (count > maxChannelCount) {
      maxChannelCount = count;
      prefersChannel = channel;
    }
  }

  // Escalation channel (fastest response time)
  let escalationChannel: string | null = prefersChannel;
  const channelResponseTimes: Record<string, number[]> = {};
  for (const event of events) {
    if (event.response_time_minutes && event.direction === "incoming") {
      if (!channelResponseTimes[event.channel_type]) {
        channelResponseTimes[event.channel_type] = [];
      }
      channelResponseTimes[event.channel_type].push(event.response_time_minutes);
    }
  }

  let fastestAvg = Infinity;
  for (const [channel, times] of Object.entries(channelResponseTimes)) {
    const avg = times.reduce((a, b) => a + b, 0) / times.length;
    if (avg < fastestAvg) {
      fastestAvg = avg;
      escalationChannel = channel;
    }
  }

  // 5. Conflict sensitivity (frequency of negative sentiment / conflict)
  const conflictSensitivity = events.length > 0
    ? Math.min(1, (conflictEvents + negativeSentimentEvents) / events.length)
    : 0.5;

  // 6. Brevity preference (simple heuristic: shorter messages = better sentiment)
  // For now, default to 0.5 (balanced)
  const brevityPreference = 0.5;

  // 7. Formality/directness (simple heuristics)
  // For now, default to 0.5
  const formalityPreference = 0.5;
  const directnessPreference = 0.5;

  // 8. Reliability score (promises kept vs missed)
  const { data: promises } = await supabaseAdmin
    .from("email_promises")
    .select("status, comm_messages(id)")
    .eq("user_id", dbUserId)
    .not("comm_message_id", "is", null)
    .in(
      "comm_message_id",
      events
        .map((e) => e.comm_message_id)
        .filter((id): id is string => !!id)
    );

  const totalPromises = (promises || []).length;
  const keptPromises = (promises || []).filter((p) => p.status === "kept").length;
  const reliabilityScore =
    totalPromises > 0 ? keptPromises / totalPromises : 0.5;

  // 9. Risk score (conflict + missed promises + decreasing sentiment)
  const avgSentiment = events.length > 0 ? totalSentiment / events.length : 0;
  const recentEvents = events.slice(0, 10);
  const recentSentiment =
    recentEvents.length > 0
      ? recentEvents.reduce((sum, e) => sum + (e.sentiment || 0), 0) / recentEvents.length
      : 0;

  const sentimentDecline = avgSentiment > recentSentiment ? avgSentiment - recentSentiment : 0;
  const missedPromises = totalPromises - keptPromises;
  const missedPromiseRate = totalPromises > 0 ? missedPromises / totalPromises : 0;

  const riskScore = Math.min(
    1,
    conflictSensitivity * 0.4 + missedPromiseRate * 0.3 + sentimentDecline * 0.3
  );

  return {
    contactId,
    emailsSent,
    emailsReceived,
    smsSent,
    smsReceived,
    callsCount,
    audioConversationsCount,
    avgResponseMinutes,
    theirAvgResponseMinutes,
    prefersChannel,
    escalationChannel,
    conflictSensitivity,
    brevityPreference,
    formalityPreference,
    directnessPreference,
    reliabilityScore,
    riskScore,
  };
}

/**
 * Upsert behavior profile to database
 */
export async function upsertBehaviorProfile(
  userId: string,
  contactId: string,
  profile: ContactBehaviorProfile
): Promise<void> {
  // Get user's database ID
  const { data: userRow } = await supabaseAdmin
    .from("users")
    .select("id")
    .eq("clerk_id", userId)
    .single();

  const dbUserId = userRow?.id || userId;

  await supabaseAdmin
    .from("contact_behavior_profiles")
    .upsert(
      {
        user_id: dbUserId,
        contact_id: contactId,
        emails_sent: profile.emailsSent,
        emails_received: profile.emailsReceived,
        sms_sent: profile.smsSent,
        sms_received: profile.smsReceived,
        calls_count: profile.callsCount,
        audio_conversations_count: profile.audioConversationsCount,
        avg_response_minutes: profile.avgResponseMinutes,
        their_avg_response_minutes: profile.theirAvgResponseMinutes,
        prefers_channel: profile.prefersChannel,
        escalation_channel: profile.escalationChannel,
        conflict_sensitivity: profile.conflictSensitivity,
        brevity_preference: profile.brevityPreference,
        formality_preference: profile.formalityPreference,
        directness_preference: profile.directnessPreference,
        reliability_score: profile.reliabilityScore,
        risk_score: profile.riskScore,
        last_updated: new Date().toISOString(),
      },
      {
        onConflict: "user_id,contact_id",
      }
    );
}

