// Life Chapters Engine
// lib/identity/chapters.ts

import { supabaseAdmin } from "@/lib/supabase";

/**
 * Detect chapter transitions
 */
export async function detectChapterTransitions(userId: string): Promise<void> {
  // Get user's database ID
  const { data: userRow } = await supabaseAdmin
    .from("users")
    .select("id")
    .eq("clerk_id", userId)
    .single();

  const dbUserId = userRow?.id || userId;

  // 1. Read last 90 days of snapshots
  const ninetyDaysAgo = new Date();
  ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

  const { data: snapshots } = await supabaseAdmin
    .from("identity_state_snapshots")
    .select("*")
    .eq("user_id", dbUserId)
    .gte("snapshot_date", ninetyDaysAgo.toISOString().split("T")[0])
    .order("snapshot_date", { ascending: true });

  if (!snapshots || snapshots.length < 14) {
    // Need at least 14 days of data
    return;
  }

  // 2. Check for open chapter
  const { data: openChapter } = await supabaseAdmin
    .from("life_chapters")
    .select("*")
    .eq("user_id", dbUserId)
    .is("end_date", null)
    .maybeSingle();

  // 3. Compute 14-day rolling averages
  const today = new Date();
  const fourteenDaysAgo = new Date(today);
  fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);
  const twentyEightDaysAgo = new Date(today);
  twentyEightDaysAgo.setDate(twentyEightDaysAgo.getDate() - 28);

  const recentSnapshots = snapshots.filter(
    (s) => new Date(s.snapshot_date) >= fourteenDaysAgo
  );
  const priorSnapshots = snapshots.filter(
    (s) =>
      new Date(s.snapshot_date) >= twentyEightDaysAgo &&
      new Date(s.snapshot_date) < fourteenDaysAgo
  );

  if (recentSnapshots.length < 7 || priorSnapshots.length < 7) {
    return;
  }

  // Calculate average MXP trend
  const recentAvgTrend =
    recentSnapshots.reduce((sum, s) => sum + (s.xp_trend_7d || 0), 0) / recentSnapshots.length;
  const priorAvgTrend =
    priorSnapshots.reduce((sum, s) => sum + (s.xp_trend_7d || 0), 0) / priorSnapshots.length;

  const trendChange = recentAvgTrend - priorAvgTrend;

  // 4. Detect transitions
  // Ascent Chapter: MXP trend increases > 40%
  if (trendChange > 40 && !openChapter) {
    // Find dominant identity
    const identityCounts = new Map<string, number>();
    recentSnapshots.forEach((s) => {
      if (s.identity_name) {
        identityCounts.set(s.identity_name, (identityCounts.get(s.identity_name) || 0) + 1);
      }
    });

    let dominantIdentity = "Unknown";
    let maxCount = 0;
    for (const [name, count] of identityCounts.entries()) {
      if (count > maxCount) {
        maxCount = count;
        dominantIdentity = name;
      }
    }

    // Create new chapter
    await supabaseAdmin.from("life_chapters").insert({
      user_id: dbUserId,
      title: "Ascent Chapter",
      description: `Rapid growth in ${dominantIdentity} identity. Momentum building.`,
      start_date: today.toISOString().split("T")[0],
      primary_identity_name: dominantIdentity,
      emotion_theme: "ascent",
    });

    console.log(`[Chapters] Created Ascent Chapter for user ${userId}`);
  }

  // Recovery Chapter: Stress events decreased > 30%
  const recentStressCount = recentSnapshots.filter((s) =>
    (s.emotions_dominant || []).includes("stress")
  ).length;
  const priorStressCount = priorSnapshots.filter((s) =>
    (s.emotions_dominant || []).includes("stress")
  ).length;

  const stressReduction =
    priorStressCount > 0
      ? ((priorStressCount - recentStressCount) / priorStressCount) * 100
      : 0;

  if (stressReduction > 30 && !openChapter) {
    await supabaseAdmin.from("life_chapters").insert({
      user_id: dbUserId,
      title: "Recovery Chapter",
      description: "Significant reduction in stress. Finding balance and stability.",
      start_date: today.toISOString().split("T")[0],
      emotion_theme: "recovery",
    });

    console.log(`[Chapters] Created Recovery Chapter for user ${userId}`);
  }

  // 5. Close previous chapter if pattern stabilizes
  if (openChapter) {
    const chapterStart = new Date(openChapter.start_date);
    const daysSinceStart = (today.getTime() - chapterStart.getTime()) / (1000 * 60 * 60 * 24);

    // Close if chapter is > 30 days old and trend has stabilized
    if (daysSinceStart > 30 && Math.abs(trendChange) < 10) {
      await supabaseAdmin
        .from("life_chapters")
        .update({ end_date: today.toISOString().split("T")[0] })
        .eq("id", openChapter.id);

      console.log(`[Chapters] Closed chapter ${openChapter.id} for user ${userId}`);
    }
  }
}

