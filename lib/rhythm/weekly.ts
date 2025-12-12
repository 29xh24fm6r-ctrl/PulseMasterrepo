// Weekly Review Engine
// lib/rhythm/weekly.ts

import { supabaseAdmin } from "@/lib/supabase";
import { WeeklyReviewData } from "./types";
import { llmComplete } from "@/lib/llm/client";

/**
 * Get Monday of ISO week for a date
 */
export function getWeekStart(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Adjust when day is Sunday
  const result = new Date(d);
  result.setDate(d.getDate() - day + (day === 0 ? -6 : 1));
  result.setHours(0, 0, 0, 0);
  return result;
}

/**
 * Generate weekly review data
 */
export async function generateWeeklyReviewData(
  userId: string,
  weekStart: Date
): Promise<WeeklyReviewData> {
  // Get user's database ID
  const { data: userRow } = await supabaseAdmin
    .from("users")
    .select("id")
    .eq("clerk_id", userId)
    .single();

  const dbUserId = userRow?.id || userId;

  const weekStartStr = weekStart.toISOString().split("T")[0];
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 6);
  weekEnd.setHours(23, 59, 59, 999);

  // 1. Sum MXP for that week
  const { data: xpRecords } = await supabaseAdmin
    .from("xp_ledger")
    .select("amount")
    .eq("user_id", dbUserId)
    .eq("category", "MXP")
    .gte("created_at", weekStart.toISOString())
    .lte("created_at", weekEnd.toISOString());

  const totalMXP = (xpRecords || []).reduce((sum, r) => sum + (r.amount || 0), 0);

  // 2. Count sessions
  const { data: sessions } = await supabaseAdmin
    .from("coaching_sessions")
    .select("id")
    .eq("user_id", dbUserId)
    .gte("started_at", weekStart.toISOString())
    .lte("started_at", weekEnd.toISOString());

  const sessionsCount = (sessions || []).length;

  // 3. Aggregate emotions from coaching_turns
  const sessionIds = (sessions || []).map((s) => s.id);
  const emotionCounts = { stress: 0, calm: 0, hype: 0, sad: 0 };

  if (sessionIds.length > 0) {
    const { data: turns } = await supabaseAdmin
      .from("coaching_turns")
      .select("emotion")
      .in("session_id", sessionIds)
      .gte("created_at", weekStart.toISOString())
      .lte("created_at", weekEnd.toISOString());

    (turns || []).forEach((turn) => {
      const emotion = turn.emotion?.toLowerCase();
      if (emotion === "stress" || emotion === "anxious" || emotion === "overwhelmed") {
        emotionCounts.stress++;
      } else if (emotion === "calm" || emotion === "stabilize") {
        emotionCounts.calm++;
      } else if (emotion === "hype" || emotion === "energized") {
        emotionCounts.hype++;
      } else if (emotion === "sad" || emotion === "down") {
        emotionCounts.sad++;
      }
    });
  }

  // 4. Look at identity_state_snapshots across the week
  const { data: snapshots } = await supabaseAdmin
    .from("identity_state_snapshots")
    .select("identity_name, xp_total, snapshot_date")
    .eq("user_id", dbUserId)
    .gte("snapshot_date", weekStartStr)
    .lte("snapshot_date", weekEnd.toISOString().split("T")[0])
    .order("snapshot_date", { ascending: true });

  const identityXP = new Map<string, number>();
  const identityStartXP = new Map<string, number>();

  (snapshots || []).forEach((snapshot) => {
    const name = snapshot.identity_name || "Unknown";
    if (!identityStartXP.has(name)) {
      identityStartXP.set(name, snapshot.xp_total || 0);
    }
    identityXP.set(name, snapshot.xp_total || 0);
  });

  const topIdentities = Array.from(identityXP.entries())
    .map(([name, endXP]) => ({
      name,
      xpGained: endXP - (identityStartXP.get(name) || 0),
    }))
    .filter((id) => id.xpGained > 0)
    .sort((a, b) => b.xpGained - a.xpGained)
    .slice(0, 3);

  // 5. Pull current chapter
  const { data: currentChapter } = await supabaseAdmin
    .from("life_chapters")
    .select("*")
    .eq("user_id", dbUserId)
    .is("end_date", null)
    .order("start_date", { ascending: false })
    .limit(1)
    .maybeSingle();

  const chapterInfo = currentChapter
    ? {
        currentChapterTitle: currentChapter.title,
        chapterStarted: currentChapter.start_date,
      }
    : undefined;

  // 6. Generate key wins and struggles
  const keyWins: string[] = [];
  const keyStruggles: string[] = [];

  // Check for completed interventions
  const { data: interventions } = await supabaseAdmin
    .from("intervention_executions")
    .select("*")
    .eq("user_id", dbUserId)
    .eq("completed", true)
    .gte("created_at", weekStart.toISOString())
    .lte("created_at", weekEnd.toISOString());

  if ((interventions || []).length > 0) {
    keyWins.push(
      `Completed ${interventions.length} intervention${interventions.length > 1 ? "s" : ""} this week — consistent self-care.`
    );
  }

  if (totalMXP > 100) {
    keyWins.push(`Earned ${totalMXP} MXP — strong mental mastery growth.`);
  }

  if (emotionCounts.calm > emotionCounts.stress) {
    keyWins.push("More calm than stress this week — emotional regulation improving.");
  }

  if (emotionCounts.stress > emotionCounts.calm * 2) {
    keyStruggles.push("Stress significantly outweighed calm this week. Consider more support.");
  }

  if (sessionsCount === 0) {
    keyStruggles.push("No coaching sessions this week. Regular check-ins help maintain momentum.");
  }

  if (keyWins.length === 0) {
    keyWins.push("You showed up this week. That's progress.");
  }

  if (keyStruggles.length === 0) {
    keyStruggles.push("No major struggles this week. Keep going.");
  }

  return {
    weekStart: weekStartStr,
    totalMXP,
    sessionsCount,
    topIdentities,
    emotionCounts,
    chapterInfo,
    keyWins: keyWins.slice(0, 5),
    keyStruggles: keyStruggles.slice(0, 3),
  };
}

/**
 * Render weekly review text
 */
export async function renderWeeklyReviewText(
  data: WeeklyReviewData
): Promise<string> {
  const prompt = `You are Pulse, a high-end executive assistant and life OS.

Create a comprehensive weekly review from this data:

Week Start: ${data.weekStart}
Total MXP: ${data.totalMXP}
Sessions: ${data.sessionsCount}
Top Identities: ${JSON.stringify(data.topIdentities)}
Emotion Counts: ${JSON.stringify(data.emotionCounts)}
Chapter: ${data.chapterInfo ? JSON.stringify(data.chapterInfo) : "None"}
Key Wins: ${JSON.stringify(data.keyWins)}
Key Struggles: ${JSON.stringify(data.keyStruggles)}

Write a 3-4 paragraph review that:
1. Summarizes the week's journey
2. Highlights key wins and growth
3. Acknowledges struggles with compassion
4. Points to next week with 3 specific priorities

Be reflective, supportive, and forward-looking.`;

  try {
    const summary = await llmComplete(prompt, {
      model: "gpt-4o-mini",
      temperature: 0.7,
      max_tokens: 400,
    });

    return summary || generateFallbackWeeklyReview(data);
  } catch (err) {
    console.error("[RhythmWeekly] Failed to render review:", err);
    return generateFallbackWeeklyReview(data);
  }
}

function generateFallbackWeeklyReview(data: WeeklyReviewData): string {
  let text = `Weekly Review for week of ${new Date(data.weekStart).toLocaleDateString()}.\n\n`;

  text += `You completed ${data.sessionsCount} session${data.sessionsCount !== 1 ? "s" : ""} and earned ${data.totalMXP} MXP this week.\n\n`;

  if (data.keyWins.length > 0) {
    text += `Wins:\n${data.keyWins.map((w) => `• ${w}`).join("\n")}\n\n`;
  }

  if (data.keyStruggles.length > 0) {
    text += `Areas to watch:\n${data.keyStruggles.map((s) => `• ${s}`).join("\n")}\n\n`;
  }

  if (data.chapterInfo) {
    text += `Current chapter: ${data.chapterInfo.currentChapterTitle} (started ${data.chapterInfo.chapterStarted}).`;
  }

  return text;
}

/**
 * Upsert weekly review entry
 */
export async function upsertWeeklyReviewEntry(
  userId: string,
  weekStart: Date,
  summary: string,
  data: WeeklyReviewData
): Promise<void> {
  // Get user's database ID
  const { data: userRow } = await supabaseAdmin
    .from("users")
    .select("id")
    .eq("clerk_id", userId)
    .single();

  const dbUserId = userRow?.id || userId;

  const weekStartStr = weekStart.toISOString().split("T")[0];

  await supabaseAdmin
    .from("weekly_reviews")
    .upsert(
      {
        user_id: dbUserId,
        week_start: weekStartStr,
        summary: summary,
        data: data,
      },
      {
        onConflict: "user_id,week_start",
      }
    );
}

