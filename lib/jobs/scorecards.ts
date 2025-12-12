// Job Scorecard Engine
// lib/jobs/scorecards.ts

import { supabaseAdmin } from "@/lib/supabase";

/**
 * Compute daily job scorecard for user
 */
export async function computeDailyJobScorecard(
  userId: string,
  date: Date
): Promise<void> {
  // Get user's database ID
  const { data: userRow } = await supabaseAdmin
    .from("users")
    .select("id")
    .eq("clerk_id", userId)
    .single();

  const dbUserId = userRow?.id || userId;

  // Get active job profile
  const { data: jobProfile } = await supabaseAdmin
    .from("user_job_profiles")
    .select("id, job_node_id")
    .eq("user_id", dbUserId)
    .eq("is_active", true)
    .maybeSingle();

  if (!jobProfile || !jobProfile.job_node_id) {
    return; // No job profile set
  }

  // Get KPIs for this job
  const { data: kpis } = await supabaseAdmin
    .from("job_kpis")
    .select("*")
    .eq("job_node_id", jobProfile.job_node_id);

  if (!kpis || kpis.length === 0) {
    return; // No KPIs defined
  }

  const dateStr = date.toISOString().split("T")[0];
  const startOfDay = new Date(date);
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date(date);
  endOfDay.setHours(23, 59, 59, 999);

  const kpiValues: Record<string, number> = {};
  const kpiScores: Record<string, number> = {};
  let totalWeightedScore = 0;
  let totalWeight = 0;

  // Compute each KPI
  for (const kpi of kpis) {
    let actualValue = 0;

    switch (kpi.kpi_key) {
      case "daily_deep_work_hours":
        // Try focus_sessions first, fallback to coaching sessions as proxy
        try {
          const { data: sessions } = await supabaseAdmin
            .from("focus_sessions")
            .select("duration_minutes")
            .eq("user_id", dbUserId)
            .gte("started_at", startOfDay.toISOString())
            .lte("started_at", endOfDay.toISOString());

          actualValue =
            (sessions?.reduce((sum, s) => sum + (s.duration_minutes || 0), 0) || 0) / 60;
        } catch (err) {
          // Table doesn't exist, use coaching sessions as proxy (estimate 30 min per session)
          const { data: coachingSessions } = await supabaseAdmin
            .from("coaching_sessions")
            .select("id")
            .eq("user_id", dbUserId)
            .gte("started_at", startOfDay.toISOString())
            .lte("started_at", endOfDay.toISOString());

          actualValue = ((coachingSessions?.length || 0) * 30) / 60;
        }
        break;

      case "deal_touchpoints_count":
        // Count email_items, sms_messages, calls with deal_id for the day
        const [emailCount, smsCount, callCount] = await Promise.all([
          supabaseAdmin
            .from("email_items")
            .select("*", { count: "exact", head: true })
            .eq("user_id", dbUserId)
            .not("deal_id", "is", null)
            .gte("sent_at", startOfDay.toISOString())
            .lte("sent_at", endOfDay.toISOString()),
          supabaseAdmin
            .from("sms_messages")
            .select("*", { count: "exact", head: true })
            .eq("user_id", dbUserId)
            .not("deal_id", "is", null)
            .gte("sent_at", startOfDay.toISOString())
            .lte("sent_at", endOfDay.toISOString()),
          supabaseAdmin
            .from("calls")
            .select("*", { count: "exact", head: true })
            .eq("user_id", dbUserId)
            .not("deal_id", "is", null)
            .gte("started_at", startOfDay.toISOString())
            .lte("started_at", endOfDay.toISOString()),
        ]);

        actualValue = (emailCount.count || 0) + (smsCount.count || 0) + (callCount.count || 0);
        break;

      case "relationship_outreach_count":
        // Count contact_interaction_events for the day
        const { count: interactionCount } = await supabaseAdmin
          .from("contact_interaction_events")
          .select("*", { count: "exact", head: true })
          .eq("user_id", dbUserId)
          .gte("occurred_at", startOfDay.toISOString())
          .lte("occurred_at", endOfDay.toISOString());

        actualValue = interactionCount || 0;
        break;

      case "tasks_completed_count":
        // Count completed tasks for the day
        const { count: taskCount } = await supabaseAdmin
          .from("tasks")
          .select("*", { count: "exact", head: true })
          .eq("user_id", dbUserId)
          .eq("status", "done")
          .gte("updated_at", startOfDay.toISOString())
          .lte("updated_at", endOfDay.toISOString());

        actualValue = taskCount || 0;
        break;

      default:
        actualValue = 0;
    }

    kpiValues[kpi.kpi_key] = actualValue;

    // Compute score (0-1) based on target
    const target = kpi.target_value || 1;
    const score = Math.min(1, actualValue / target);
    kpiScores[kpi.kpi_key] = score;

    // Weighted average
    const weight = kpi.weight || 1;
    totalWeightedScore += score * weight;
    totalWeight += weight;
  }

  const overallScore = totalWeight > 0 ? totalWeightedScore / totalWeight : 0;

  // Upsert scorecard
  await supabaseAdmin
    .from("job_scorecards")
    .upsert(
      {
        user_id: dbUserId,
        job_profile_id: jobProfile.id,
        scorecard_date: dateStr,
        kpi_values: kpiValues,
        kpi_scores: kpiScores,
        overall_score: overallScore,
      },
      {
        onConflict: "user_id,job_profile_id,scorecard_date",
      }
    );
}

