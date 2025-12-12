// Power Patterns Background Jobs
// lib/patterns/cron.ts

import { recomputePowerPatternsForUser } from "./engine";
import { generateBehaviorPredictionsForUser } from "@/lib/prediction/engine";
import { supabaseAdmin } from "@/lib/supabase";

/**
 * Nightly job: Recompute power patterns for all active users
 * 
 * To run this as a Supabase cron job:
 * 
 * ```sql
 * SELECT cron.schedule(
 *   'recompute-power-patterns',
 *   '0 2 * * *', -- 2 AM daily
 *   $$
 *   SELECT net.http_post(
 *     url := 'https://your-api.com/api/cron/recompute-patterns',
 *     headers := '{"Content-Type": "application/json"}'::jsonb
 *   );
 *   $$
 * );
 * ```
 */
export async function runNightlyPatternRecomputation(): Promise<void> {
  console.log("[Cron] Starting nightly pattern recomputation...");

  // Get all active users (users with activity in last 30 days)
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const { data: activeUsers } = await supabaseAdmin
    .from("coaching_sessions")
    .select("user_id")
    .gte("started_at", thirtyDaysAgo.toISOString())
    .not("user_id", "is", null);

  const uniqueUserIds = new Set((activeUsers || []).map((s: any) => s.user_id));

  // Get clerk_ids for these users
  const { data: users } = await supabaseAdmin
    .from("users")
    .select("clerk_id, id")
    .in("id", Array.from(uniqueUserIds));

  let processed = 0;
  let errors = 0;

  for (const user of users || []) {
    if (!user.clerk_id) continue;

    try {
      await recomputePowerPatternsForUser(user.clerk_id);
      processed++;
    } catch (err) {
      console.error(`[Cron] Failed to recompute patterns for user ${user.clerk_id}:`, err);
      errors++;
    }
  }

  console.log(`[Cron] Pattern recomputation complete: ${processed} processed, ${errors} errors`);
}

/**
 * Morning job: Generate behavior predictions for today
 * 
 * To run this as a Supabase cron job:
 * 
 * ```sql
 * SELECT cron.schedule(
 *   'generate-behavior-predictions',
 *   '0 6 * * *', -- 6 AM daily
 *   $$
 *   SELECT net.http_post(
 *     url := 'https://your-api.com/api/cron/generate-predictions',
 *     headers := '{"Content-Type": "application/json"}'::jsonb
 *   );
 *   $$
 * );
 * ```
 */
export async function runMorningPredictionGeneration(): Promise<void> {
  console.log("[Cron] Starting morning prediction generation...");

  // Get all active users
  const { data: users } = await supabaseAdmin
    .from("users")
    .select("clerk_id")
    .not("clerk_id", "is", null);

  const today = new Date();
  let processed = 0;
  let errors = 0;

  for (const user of users || []) {
    if (!user.clerk_id) continue;

    try {
      await generateBehaviorPredictionsForUser(user.clerk_id, today);
      processed++;
    } catch (err) {
      console.error(`[Cron] Failed to generate predictions for user ${user.clerk_id}:`, err);
      errors++;
    }
  }

  console.log(`[Cron] Prediction generation complete: ${processed} processed, ${errors} errors`);
}

