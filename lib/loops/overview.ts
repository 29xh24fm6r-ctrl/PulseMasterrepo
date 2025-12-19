import "server-only";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { emptyOverview } from "@/lib/shared/overview";

export async function getLoopsOverview(clerkUserId: string) {
  try {
    // Resolve Clerk ID to database UUID
    const { data: userRow } = await supabaseAdmin
      .from("users")
      .select("id")
      .eq("clerk_id", clerkUserId)
      .single();

    const dbUserId = userRow?.id || clerkUserId;

    // Get active loops (stress patterns)
    // Note: This assumes a table exists for loops/stress patterns
    // If not, we'll return empty state
    const { data: loops } = await supabaseAdmin
      .from("stress_loops")
      .select("id, name, trigger_count, last_triggered_at")
      .eq("user_id", dbUserId)
      .eq("status", "active")
      .order("trigger_count", { ascending: false })
      .limit(10);

    // Get top trigger
    const topTrigger = loops?.[0];

    const activeLoopsCount = loops?.length || 0;
    const topTriggerName = topTrigger?.name || "No active loops";

    // If table doesn't exist, return empty state
    if (!loops && activeLoopsCount === 0) {
      return {
        ok: true,
        module: "loops",
        summary: "No active stress loops detected",
        cards: [
          {
            title: "Active Loops",
            value: 0,
            subtitle: "Stress patterns detected",
            state: "good",
          },
          {
            title: "Log a Trigger",
            subtitle: "Track stress patterns and triggers",
            state: "empty",
            cta: { label: "Log Trigger", href: "/loops" },
          },
        ],
        items: [],
        meta: {},
      };
    }

    return {
      ok: true,
      module: "loops",
      summary: `${activeLoopsCount} active loops | Top trigger: ${topTriggerName}`,
      cards: [
        {
          title: "Active Loops",
          value: activeLoopsCount,
          subtitle: "Stress patterns detected",
          state: activeLoopsCount > 0 ? "bad" : "good",
        },
        {
          title: "Top Trigger",
          value: topTriggerName,
          subtitle: topTrigger?.trigger_count ? `Triggered ${topTrigger.trigger_count} times` : "No triggers",
          state: topTrigger ? "bad" : "good",
        },
        {
          title: "Log a Trigger",
          subtitle: "Track stress patterns and triggers",
          state: "empty",
          cta: { label: "Log Trigger", href: "/loops" },
        },
      ],
      items: loops || [],
      meta: { activeLoopsCount, topTriggerId: topTrigger?.id || null },
    };
  } catch (err) {
    console.error("[LoopsOverview] Error:", err);
    // Return empty state if table doesn't exist
    return {
      ok: true,
      module: "loops",
      summary: "Stress loop tracking not yet configured",
      cards: [
        {
          title: "Active Loops",
          value: 0,
          subtitle: "Stress patterns detected",
          state: "good",
        },
        {
          title: "Log a Trigger",
          subtitle: "Track stress patterns and triggers",
          state: "empty",
          cta: { label: "Log Trigger", href: "/loops" },
        },
      ],
      items: [],
      meta: {},
    };
  }
}

