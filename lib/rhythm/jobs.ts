// Daily Rhythm Background Jobs
// lib/rhythm/jobs.ts

import {
  generateMorningBriefing,
  generateMiddayCheckin,
  generateEveningDebrief,
  upsertDailyRhythmEntry,
} from "./engine";
import {
  renderMorningBriefingText,
  renderMiddayCheckinText,
  renderEveningDebriefText,
} from "./llm";
import {
  generateWeeklyReviewData,
  renderWeeklyReviewText,
  upsertWeeklyReviewEntry,
  getWeekStart,
} from "./weekly";
import { supabaseAdmin } from "@/lib/supabase";

/**
 * Morning setup for all active users
 * 
 * To run as cron: 6 AM daily
 */
export async function runMorningSetupForAllUsers(date: Date): Promise<void> {
  console.log("[RhythmJobs] Starting morning setup...");

  const { data: users } = await supabaseAdmin
    .from("users")
    .select("clerk_id")
    .not("clerk_id", "is", null);

  let processed = 0;
  let errors = 0;

  for (const user of users || []) {
    if (!user.clerk_id) continue;

    try {
      const data = await generateMorningBriefing(user.clerk_id, date);
      const summary = await renderMorningBriefingText(data);
      await upsertDailyRhythmEntry(user.clerk_id, date, "morning_briefing", summary, data);
      processed++;
    } catch (err) {
      console.error(`[RhythmJobs] Failed morning setup for ${user.clerk_id}:`, err);
      errors++;
    }
  }

  console.log(`[RhythmJobs] Morning setup complete: ${processed} processed, ${errors} errors`);
}

/**
 * Midday snapshot for all active users
 * 
 * To run as cron: 1 PM daily
 */
export async function runMiddaySnapshotForAllUsers(date: Date): Promise<void> {
  console.log("[RhythmJobs] Starting midday snapshot...");

  const { data: users } = await supabaseAdmin
    .from("users")
    .select("clerk_id")
    .not("clerk_id", "is", null);

  let processed = 0;
  let errors = 0;

  for (const user of users || []) {
    if (!user.clerk_id) continue;

    try {
      const data = await generateMiddayCheckin(user.clerk_id, date);
      const summary = await renderMiddayCheckinText(data);
      await upsertDailyRhythmEntry(user.clerk_id, date, "midday_checkin", summary, data);
      processed++;
    } catch (err) {
      console.error(`[RhythmJobs] Failed midday snapshot for ${user.clerk_id}:`, err);
      errors++;
    }
  }

  console.log(`[RhythmJobs] Midday snapshot complete: ${processed} processed, ${errors} errors`);
}

/**
 * Evening debrief for all active users
 * 
 * To run as cron: 8 PM daily
 */
export async function runEveningDebriefForAllUsers(date: Date): Promise<void> {
  console.log("[RhythmJobs] Starting evening debrief...");

  const { data: users } = await supabaseAdmin
    .from("users")
    .select("clerk_id")
    .not("clerk_id", "is", null);

  let processed = 0;
  let errors = 0;

  for (const user of users || []) {
    if (!user.clerk_id) continue;

    try {
      const data = await generateEveningDebrief(user.clerk_id, date);
      const summary = await renderEveningDebriefText(data);
      await upsertDailyRhythmEntry(user.clerk_id, date, "evening_debrief", summary, data);
      processed++;
    } catch (err) {
      console.error(`[RhythmJobs] Failed evening debrief for ${user.clerk_id}:`, err);
      errors++;
    }
  }

  console.log(`[RhythmJobs] Evening debrief complete: ${processed} processed, ${errors} errors`);
}

/**
 * Weekly review for all active users
 * 
 * To run as cron: Monday 9 AM
 */
export async function runWeeklyReviewForAllUsers(weekStart: Date): Promise<void> {
  console.log("[RhythmJobs] Starting weekly review...");

  const { data: users } = await supabaseAdmin
    .from("users")
    .select("clerk_id")
    .not("clerk_id", "is", null);

  let processed = 0;
  let errors = 0;

  for (const user of users || []) {
    if (!user.clerk_id) continue;

    try {
      const data = await generateWeeklyReviewData(user.clerk_id, weekStart);
      const summary = await renderWeeklyReviewText(data);
      await upsertWeeklyReviewEntry(user.clerk_id, weekStart, summary, data);
      processed++;
    } catch (err) {
      console.error(`[RhythmJobs] Failed weekly review for ${user.clerk_id}:`, err);
      errors++;
    }
  }

  console.log(`[RhythmJobs] Weekly review complete: ${processed} processed, ${errors} errors`);
}

