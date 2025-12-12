// Nightly Growth Job
// lib/jobs/nightly-growth-job.ts

import { computeIdentitySnapshotsForDate } from "@/lib/identity/growth";
import { detectChapterTransitions } from "@/lib/identity/chapters";
import { recomputePowerPatternsForUser } from "@/lib/patterns/engine";
import { generateBehaviorPredictionsForUser } from "@/lib/prediction/engine";
import { checkCriticalEmailRisks, createEmailRiskNotification } from "@/lib/notifications/email-guard";
import { supabaseAdmin } from "@/lib/supabase";

/**
 * Nightly job: Process growth data for all active users
 * 
 * To run this as a Supabase cron job:
 * 
 * ```sql
 * SELECT cron.schedule(
 *   'nightly-growth-processing',
 *   '0 3 * * *', -- 3 AM daily
 *   $$
 *   SELECT net.http_post(
 *     url := 'https://your-api.com/api/cron/nightly-growth',
 *     headers := '{"Content-Type": "application/json"}'::jsonb
 *   );
 *   $$
 * );
 * ```
 */
export async function runNightlyGrowthJob(): Promise<void> {
  console.log("[NightlyGrowth] Starting nightly growth processing...");

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

  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const today = new Date();

  let processed = 0;
  let errors = 0;

  for (const user of users || []) {
    if (!user.clerk_id) continue;

    try {
      // 1. Compute identity snapshots for yesterday
      await computeIdentitySnapshotsForDate({
        userId: user.clerk_id,
        date: yesterday,
      });

      // 2. Detect chapter transitions
      await detectChapterTransitions(user.clerk_id);

      // 3. Recompute power patterns
      await recomputePowerPatternsForUser(user.clerk_id);

      // 4. Generate behavior predictions for today
      await generateBehaviorPredictionsForUser(user.clerk_id, today);

      // 5. Check email risks
      try {
        const emailRisks = await checkCriticalEmailRisks(user.clerk_id);
        await createEmailRiskNotification(user.clerk_id, emailRisks);
      } catch (err) {
        console.warn(`[NightlyGrowth] Failed to check email risks for ${user.clerk_id}:`, err);
      }

      processed++;
    } catch (err) {
      console.error(`[NightlyGrowth] Failed to process user ${user.clerk_id}:`, err);
      errors++;
    }
  }

  console.log(
    `[NightlyGrowth] Processing complete: ${processed} processed, ${errors} errors`
  );
}

