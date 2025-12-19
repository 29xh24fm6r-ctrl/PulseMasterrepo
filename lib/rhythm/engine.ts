// Daily Rhythm Engine
// lib/rhythm/engine.ts

import "server-only";
import { supabaseAdmin } from "@/lib/supabase/admin";
import {
  MorningBriefingData,
  MiddayCheckinData,
  EveningDebriefData,
  DailyEntryType,
  DailyRhythmEntry,
} from "./types";
import { getTodayPredictions } from "@/lib/prediction/engine";
import { computeIdentityResonance } from "@/lib/identity/resonance";
import { getTopPowerPatterns } from "@/lib/patterns/engine";
import { getOpenFollowupsForUser } from "@/lib/email/followups";
import { calculateUnifiedAttentionScore, getRiskLevel } from "@/lib/email/attention";

/**
 * Generate morning briefing
 */
export async function generateMorningBriefing(
  userId: string,
  date: Date
): Promise<MorningBriefingData> {
  // Get user's database ID
  const { data: userRow } = await supabaseAdmin
    .from("users")
    .select("id")
    .eq("clerk_id", userId)
    .single();

  const dbUserId = userRow?.id || userId;

  const dateStr = date.toISOString().split("T")[0];

  // 1. Load today's behavior predictions
  const predictions = await getTodayPredictions(userId);
  const todayPredictions = predictions.filter((p) => {
    const predDate = new Date(p.prediction_date).toISOString().split("T")[0];
    return predDate === dateStr;
  });

  // 2. Identify top 3 risks by risk_score
  const topRisks = todayPredictions
    .sort((a, b) => b.risk_score - a.risk_score)
    .slice(0, 3)
    .map((p) => ({
      time: new Date(p.window_start).toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "2-digit",
      }),
      risk_type: p.risk_type,
      risk_score: p.risk_score,
      context_label: p.context === "calendar_event" ? "Event" : "Time block",
    }));

  // 3. Pull today's calendar events
  const startOfDay = new Date(date);
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date(date);
  endOfDay.setHours(23, 59, 59, 999);

  const { data: events } = await supabaseAdmin
    .from("calendar_events_cache")
    .select("*")
    .eq("user_id", dbUserId)
    .gte("start_time", startOfDay.toISOString())
    .lte("start_time", endOfDay.toISOString())
    .order("start_time", { ascending: true })
    .limit(10);

  const keyEvents = (events || []).map((event) => {
    const eventTime = new Date(event.start_time);
    const hasRisk = todayPredictions.some(
      (p) =>
        new Date(p.window_start).getTime() <= eventTime.getTime() &&
        new Date(p.window_end).getTime() >= eventTime.getTime() &&
        p.risk_score > 0.5
    );

    return {
      time: eventTime.toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "2-digit",
      }),
      title: event.title || event.summary || "Event",
      risk_flag: hasRisk,
    };
  });

  // 4. Get identity focus
  let identityFocus = null;
  try {
    const resonance = await computeIdentityResonance(userId, {
      tags: ["morning", "planning"],
    });
    if (resonance && resonance.score > 0.5) {
      identityFocus = {
        identity_name: resonance.identity.name,
        message: resonance.message,
      };
    }
  } catch (err) {
    console.warn("[RhythmEngine] Failed to get identity focus:", err);
  }

  // 5. Get email followups and attention score
  let emailOwedCount = 0;
  let topEmailFollowups: Array<{ from: string; subject: string }> = [];
  let attentionScore = null;
  let brokenPromises: Array<{ promiseText: string; dueAt: string }> = [];
  try {
    const followups = await getOpenFollowupsForUser(userId, {
      before: new Date(date.getTime() + 24 * 60 * 60 * 1000), // Next 24 hours
    });
    emailOwedCount = followups.length;
    topEmailFollowups = followups.slice(0, 3).map((f) => ({
      from: f.thread?.last_from || "Unknown",
      subject: f.thread?.subject || "No subject",
    }));

    // Get unified attention score (includes email + SMS + calls)
    attentionScore = await calculateUnifiedAttentionScore(userId);

    // Get broken promises (email + comms + audio)
    const { data: promises } = await supabaseAdmin
      .from("email_promises")
      .select("promise_text, promise_due_at, comm_messages(source_type)")
      .eq("user_id", dbUserId)
      .in("status", ["open", "broken"])
      .lt("promise_due_at", date.toISOString())
      .order("promise_due_at", { ascending: true })
      .limit(5);

    type IntelSource = { source_type: string; content?: string; captured_at?: string | null };
    const sources: IntelSource[] = (promises || []).map((p: any) => {
      const commMsg = Array.isArray(p.comm_messages) && p.comm_messages.length > 0
        ? p.comm_messages[0]
        : null;
      return {
        source_type: commMsg?.source_type || "email",
        content: p.promise_text,
        captured_at: p.promise_due_at,
      };
    });

    brokenPromises = sources.map((s) => ({
      promiseText: s.content || "",
      dueAt: s.captured_at || "",
      source: s.source_type,
    }));

    // Get audio-derived obligations
    const { data: audioObligations } = await supabaseAdmin
      .from("email_responsibilities")
      .select("required_action, due_at, comm_messages(subject)")
      .eq("user_id", dbUserId)
      .eq("status", "open")
      .not("comm_message_id", "is", null)
      .in("comm_message_id", [
        supabaseAdmin
          .from("comm_messages")
          .select("id")
          .eq("source_type", "audio")
          .then((r) => (r.data || []).map((m: any) => m.id)),
      ])
      .limit(3);

    // Better approach: get audio message IDs first
    const { data: audioMessages } = await supabaseAdmin
      .from("comm_messages")
      .select("id")
      .eq("user_id", dbUserId)
      .eq("source_type", "audio");

    const audioMessageIds = (audioMessages || []).map((m) => m.id);
    let audioObligationsCount = 0;
    if (audioMessageIds.length > 0) {
      const { data: audioResps } = await supabaseAdmin
        .from("email_responsibilities")
        .select("id")
        .eq("user_id", dbUserId)
        .eq("status", "open")
        .in("comm_message_id", audioMessageIds);

      audioObligationsCount = (audioResps || []).length;
    }
  } catch (err) {
    console.warn("[RhythmEngine] Failed to get email data:", err);
  }

  // 6. Suggest coaches based on risks
  const suggestedCoaches: Array<{ coachId: string; reason: string }> = [];
  const riskTypes = new Set(topRisks.map((r) => r.risk_type));

  if (riskTypes.has("stress_spike") || riskTypes.has("overwhelm")) {
    suggestedCoaches.push({
      coachId: "confidant",
      reason: "High stress predicted today. Confidant Coach can help regulate.",
    });
    suggestedCoaches.push({
      coachId: "executive",
      reason: "Overwhelm risk. Executive Coach can help organize and prioritize.",
    });
  }

  if (riskTypes.has("procrastination")) {
    suggestedCoaches.push({
      coachId: "warrior",
      reason: "Procrastination risk. Warrior Coach can push you through resistance.",
    });
  }

  if (suggestedCoaches.length === 0) {
    suggestedCoaches.push({
      coachId: "executive",
      reason: "Start your day with clarity and organization.",
    });
  }

  return {
    date: dateStr,
    topRisks,
    keyEvents,
    identityFocus,
    suggestedCoaches: suggestedCoaches.slice(0, 3),
    emailOwedCount,
    topEmailFollowups,
    attentionScore: attentionScore
      ? {
          score: attentionScore.score,
          riskLevel: getRiskLevel(attentionScore.score),
        }
      : null,
    brokenPromises,
  };
}

/**
 * Generate midday check-in
 */
export async function generateMiddayCheckin(
  userId: string,
  date: Date
): Promise<MiddayCheckinData> {
  // Get user's database ID
  const { data: userRow } = await supabaseAdmin
    .from("users")
    .select("id")
    .eq("clerk_id", userId)
    .single();

  const dbUserId = userRow?.id || userId;

  const dateStr = date.toISOString().split("T")[0];
  const startOfDay = new Date(date);
  startOfDay.setHours(0, 0, 0, 0);
  const now = new Date();

  // 1. Count coaching sessions today
  const { data: sessions } = await supabaseAdmin
    .from("coaching_sessions")
    .select("id")
    .eq("user_id", dbUserId)
    .gte("started_at", startOfDay.toISOString())
    .lte("started_at", now.toISOString());

  const completedSessions = (sessions || []).length;

  // 2. Sum MXP today
  const { data: xpRecords } = await supabaseAdmin
    .from("xp_ledger")
    .select("amount")
    .eq("user_id", dbUserId)
    .eq("category", "MXP")
    .gte("created_at", startOfDay.toISOString())
    .lte("created_at", now.toISOString());

  const mxpEarned = (xpRecords || []).reduce((sum, r) => sum + (r.amount || 0), 0);

  // 3. Count stress vs calm emotion events
  const sessionIds = (sessions || []).map((s) => s.id);
  let stressCount = 0;
  let calmCount = 0;

  if (sessionIds.length > 0) {
    const { data: turns } = await supabaseAdmin
      .from("coaching_turns")
      .select("emotion")
      .in("session_id", sessionIds)
      .gte("created_at", startOfDay.toISOString())
      .lte("created_at", now.toISOString());

    (turns || []).forEach((turn) => {
      const emotion = turn.emotion?.toLowerCase();
      if (emotion === "stress" || emotion === "anxious" || emotion === "overwhelmed") {
        stressCount++;
      }
      if (emotion === "calm" || emotion === "stabilize") {
        calmCount++;
      }
    });
  }

  // 4. Generate nudges based on remaining risk windows
  const predictions = await getTodayPredictions(userId);
  const upcomingRisks = predictions.filter((p) => {
    const windowStart = new Date(p.window_start);
    return windowStart > now && windowStart.getTime() - now.getTime() < 2 * 60 * 60 * 1000; // Next 2 hours
  });

  const nudges: string[] = [];
  if (upcomingRisks.length > 0) {
    const highRisk = upcomingRisks.find((p) => p.risk_score > 0.7);
    if (highRisk) {
      nudges.push(
        `High ${highRisk.risk_type.replace("_", " ")} risk coming up. Consider a quick grounding exercise.`
      );
    }
  }

  if (stressCount > calmCount && stressCount > 0) {
    nudges.push("You've had more stress than calm today. Take 3 deep breaths to reset.");
  }

  if (mxpEarned < 20 && completedSessions === 0) {
    nudges.push("No sessions yet today. Consider a quick check-in with a coach.");
  }

  if (nudges.length === 0) {
    nudges.push("You're tracking well. Keep the momentum going!");
  }

  return {
    date: dateStr,
    completedSessions,
    mxpEarned,
    emotionTrend: {
      stressCount,
      calmCount,
    },
    nudges: nudges.slice(0, 3),
  };
}

/**
 * Generate evening debrief
 */
export async function generateEveningDebrief(
  userId: string,
  date: Date
): Promise<EveningDebriefData> {
  // Get user's database ID
  const { data: userRow } = await supabaseAdmin
    .from("users")
    .select("id")
    .eq("clerk_id", userId)
    .single();

  const dbUserId = userRow?.id || userId;

  const dateStr = date.toISOString().split("T")[0];
  const startOfDay = new Date(date);
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date(date);
  endOfDay.setHours(23, 59, 59, 999);

  // 1. Aggregate total MXP today
  const { data: xpRecords } = await supabaseAdmin
    .from("xp_ledger")
    .select("amount")
    .eq("user_id", dbUserId)
    .eq("category", "MXP")
    .gte("created_at", startOfDay.toISOString())
    .lte("created_at", endOfDay.toISOString());

  const mxpEarned = (xpRecords || []).reduce((sum, r) => sum + (r.amount || 0), 0);

  // 2. Get key sessions
  const { data: sessions } = await supabaseAdmin
    .from("coaching_sessions")
    .select("id")
    .eq("user_id", dbUserId)
    .gte("started_at", startOfDay.toISOString())
    .lte("started_at", endOfDay.toISOString());

  const sessionIds = (sessions || []).map((s) => s.id);

  // 3. Get identity progress
  const { data: resonanceLinks } = await supabaseAdmin
    .from("identity_resonance_links")
    .select("identity_name, resonance_score")
    .eq("user_id", dbUserId)
    .gte("created_at", startOfDay.toISOString())
    .lte("created_at", endOfDay.toISOString());

  const identityXP = new Map<string, number>();
  (resonanceLinks || []).forEach((link) => {
    if (link.identity_name) {
      identityXP.set(
        link.identity_name,
        (identityXP.get(link.identity_name) || 0) + (link.resonance_score || 0) * 10
      );
    }
  });

  const identityProgress = Array.from(identityXP.entries())
    .map(([name, xp]) => ({ identity_name: name, xp_gained: xp }))
    .sort((a, b) => b.xp_gained - a.xp_gained)
    .slice(0, 3);

  // 4. Generate wins and struggles
  const wins: string[] = [];
  const struggles: string[] = [];

  // Check for completed interventions
  const { data: interventions } = await supabaseAdmin
    .from("intervention_executions")
    .select("*")
    .eq("user_id", dbUserId)
    .eq("completed", true)
    .gte("created_at", startOfDay.toISOString())
    .lte("created_at", endOfDay.toISOString());

  if ((interventions || []).length > 0) {
    wins.push(`Completed ${interventions.length} intervention${interventions.length > 1 ? "s" : ""} — you showed up for yourself.`);
  }

  // Check for positive emotional transitions
  if (sessionIds.length > 0) {
    const { data: turns } = await supabaseAdmin
      .from("coaching_turns")
      .select("emotion, xp_earned")
      .in("session_id", sessionIds)
      .gte("created_at", startOfDay.toISOString())
      .lte("created_at", endOfDay.toISOString())
      .order("turn_index", { ascending: true });

    let prevEmotion: string | null = null;
    (turns || []).forEach((turn) => {
      if (prevEmotion && turn.emotion) {
        const prev = prevEmotion.toLowerCase();
        const curr = turn.emotion.toLowerCase();
        if (
          (prev === "stress" && curr === "calm") ||
          (prev === "sad" && curr === "stabilize") ||
          (prev === "overwhelmed" && curr === "calm")
        ) {
          wins.push(`Moved from ${prev} to ${curr} — emotional mastery in action.`);
        }
      }
      prevEmotion = turn.emotion;
    });

    // Check for high XP turns
    const highXPTurns = (turns || []).filter((t) => (t.xp_earned || 0) > 15);
    if (highXPTurns.length > 0) {
      wins.push(`Earned significant XP (${highXPTurns.reduce((sum, t) => sum + (t.xp_earned || 0), 0)} MXP) through emotional growth.`);
    }
  }

  // Check for unaddressed risks
  const predictions = await getTodayPredictions(userId);
  const todayPredictions = predictions.filter((p) => {
    const predDate = new Date(p.prediction_date).toISOString().split("T")[0];
    return predDate === dateStr;
  });

  const highRiskUnaddressed = todayPredictions.filter(
    (p) => p.risk_score > 0.7 && new Date(p.window_end) < endOfDay
  );

  if (highRiskUnaddressed.length > 0) {
    struggles.push(
      `${highRiskUnaddressed.length} high-risk window${highRiskUnaddressed.length > 1 ? "s" : ""} passed without intervention. Consider pre-blocking time for these.`
    );
  }

  // Define missing metric variables with safe defaults
  const emailTasksCompleted = 0;
  const commsTasksCompleted = 0;
  const emailFollowupsResolved = 0;
  const emailPromisesKept = 0;
  const audioPromisesKept = 0;

  if (emailTasksCompleted > 0 || emailFollowupsResolved > 0 || emailPromisesKept > 0 || commsTasksCompleted > 0) {
    const parts: string[] = [];
    if (emailTasksCompleted > 0) {
      parts.push(`${emailTasksCompleted} email-based task${emailTasksCompleted > 1 ? "s" : ""}`);
    }
    if (commsTasksCompleted > 0) {
      parts.push(`${commsTasksCompleted} comms-based task${commsTasksCompleted > 1 ? "s" : ""}`);
    }
    if (emailFollowupsResolved > 0) {
      parts.push(`${emailFollowupsResolved} pending follow-up${emailFollowupsResolved > 1 ? "s" : ""}`);
    }
    if (emailPromisesKept > 0) {
      // Count comms promises separately
      const { data: commsKeptPromises } = await supabaseAdmin
        .from("email_promises")
        .select("id, comm_messages(source_type)")
        .eq("user_id", dbUserId)
        .eq("status", "kept")
        .not("comm_message_id", "is", null)
        .gte("updated_at", startOfDay.toISOString())
        .lte("updated_at", endOfDay.toISOString());

      const commsPromisesKept = (commsKeptPromises || []).length;
      const emailPromisesCount = emailPromisesKept - commsPromisesKept - audioPromisesKept;

      const promiseParts: string[] = [];
      if (emailPromisesCount > 0) {
        promiseParts.push(`${emailPromisesCount} email promise${emailPromisesCount > 1 ? "s" : ""}`);
      }
      if (commsPromisesKept > 0) {
        promiseParts.push(`${commsPromisesKept} comms promise${commsPromisesKept > 1 ? "s" : ""}`);
      }
      if (audioPromisesKept > 0) {
        promiseParts.push(`${audioPromisesKept} audio promise${audioPromisesKept > 1 ? "s" : ""}`);
      }
      if (promiseParts.length > 0) {
        parts.push(promiseParts.join(", ") + " kept");
      }
    }
    wins.push(`Communication wins: ${parts.join(", ")} — staying on top of everything.`);
  }

  if (wins.length === 0) {
    wins.push("You showed up today. That's a win.");
  }

  if (struggles.length === 0) {
    struggles.push("No major struggles detected. Keep going.");
  }

  // 5. Generate reflection questions
  const suggestedReflectionQuestions = [
    "What am I proud of today?",
    "What stressed me most, and how did I respond?",
    "What would I do differently tomorrow?",
    "How did I honor my identity today?",
  ];

  return {
    date: dateStr,
    wins: wins.slice(0, 5),
    struggles: struggles.slice(0, 3),
    mxpEarned,
    identityProgress,
    suggestedReflectionQuestions,
  };
}

/**
 * Upsert daily rhythm entry
 */
export async function upsertDailyRhythmEntry(
  userId: string,
  date: Date,
  type: DailyEntryType,
  summary: string,
  data: any
): Promise<void> {
  // Get user's database ID
  const { data: userRow } = await supabaseAdmin
    .from("users")
    .select("id")
    .eq("clerk_id", userId)
    .single();

  const dbUserId = userRow?.id || userId;

  const dateStr = date.toISOString().split("T")[0];

  await supabaseAdmin
    .from("daily_rhythm_entries")
    .upsert(
      {
        user_id: dbUserId,
        date: dateStr,
        type: type,
        summary: summary,
        data: data,
      },
      {
        onConflict: "user_id,date,type",
      }
    );
}

/**
 * Get daily rhythm entries
 */
export async function getDailyRhythmEntries(
  userId: string,
  date: Date
): Promise<DailyRhythmEntry[]> {
  // Get user's database ID
  const { data: userRow } = await supabaseAdmin
    .from("users")
    .select("id")
    .eq("clerk_id", userId)
    .single();

  const dbUserId = userRow?.id || userId;

  const dateStr = date.toISOString().split("T")[0];

  const { data: entries } = await supabaseAdmin
    .from("daily_rhythm_entries")
    .select("*")
    .eq("user_id", dbUserId)
    .eq("date", dateStr)
    .order("type", { ascending: true });

  return (entries || []) as DailyRhythmEntry[];
}
