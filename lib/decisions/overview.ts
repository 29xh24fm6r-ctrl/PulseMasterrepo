import "server-only";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { emptyOverview } from "@/lib/shared/overview";

export async function getDecisionsOverview(clerkUserId: string) {
  try {
    // Resolve Clerk ID to database UUID
    const { data: userRow } = await supabaseAdmin
      .from("users")
      .select("id")
      .eq("clerk_id", clerkUserId)
      .single();

    const dbUserId = userRow?.id || clerkUserId;

    // Get open decisions
    const { data: decisions } = await supabaseAdmin
      .from("boardroom_decisions")
      .select("id, title, status, leverage_score")
      .eq("user_id", dbUserId)
      .in("status", ["open", "pending"])
      .order("leverage_score", { ascending: false })
      .limit(10);

    // Get highest leverage decision
    const highestLeverage = decisions?.[0];

    const openDecisionsCount = decisions?.length || 0;
    const highestLeverageTitle = highestLeverage?.title || "No open decisions";

    return {
      ok: true,
      module: "decisions",
      summary: `${openDecisionsCount} open decisions | Highest leverage: ${highestLeverageTitle}`,
      cards: [
        {
          title: "Open Decisions",
          value: openDecisionsCount,
          subtitle: "Decisions pending resolution",
          state: openDecisionsCount > 0 ? "warn" : "good",
        },
        {
          title: "Highest Leverage",
          value: highestLeverageTitle,
          subtitle: highestLeverage?.leverage_score ? `Score: ${highestLeverage.leverage_score}` : "No decisions",
          state: highestLeverage ? "warn" : "good",
          cta: highestLeverage ? { label: "View Decision", href: `/decisions/${highestLeverage.id}` } : undefined,
        },
        {
          title: "Run Decision Theater",
          subtitle: "Work through a decision systematically",
          state: "empty",
          cta: { label: "Start Session", href: "/decisions" },
        },
      ],
      items: decisions || [],
      meta: { openDecisionsCount, highestLeverageId: highestLeverage?.id || null },
    };
  } catch (err) {
    console.error("[DecisionsOverview] Error:", err);
    return emptyOverview("decisions", "Decisions data unavailable");
  }
}

