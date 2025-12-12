// Strategy Domain Context Builder (Mesh v2)
// lib/cortex/mesh/strategy/context.ts

import { supabaseAdmin } from "@/lib/supabase";
import { PulseDomainContext } from "@/lib/cortex/types";

/**
 * Build strategy domain context for Cognitive Mesh
 */
export async function buildStrategyContext(
  userId: string
): Promise<PulseDomainContext["strategy"]> {
  try {
    const { data: userRow } = await supabaseAdmin
      .from("users")
      .select("id")
      .eq("clerk_id", userId)
      .maybeSingle();

    const dbUserId = userRow?.id || userId;

    // Get active arcs
    const { data: arcs } = await supabaseAdmin
      .from("life_arcs")
      .select("id, name, priority, progress")
      .eq("user_id", dbUserId)
      .eq("status", "active")
      .order("priority", { ascending: true })
      .limit(10);

    const arcsList =
      arcs?.map((a) => ({
        id: a.id,
        name: a.name,
        priority: a.priority || 0,
        progress: a.progress || 0,
      })) || [];

    // Get current quarter focus from weekly plan
    const { data: weeklyPlan } = await supabaseAdmin
      .from("weekly_plans")
      .select("big_three, themes")
      .eq("user_id", dbUserId)
      .gte("week_start", new Date().toISOString().split("T")[0])
      .order("week_start", { ascending: false })
      .limit(1)
      .maybeSingle();

    const currentQuarterFocus: PulseDomainContext["strategy"]["currentQuarterFocus"] = {
      themes: (weeklyPlan?.themes as string[]) || [],
      bigThree:
        (weeklyPlan?.big_three as Array<{ id: string; title: string }>) || [],
    };

    return {
      arcs: arcsList,
      currentQuarterFocus,
    };
  } catch (err) {
    console.warn("[StrategyMesh] Failed to build context:", err);
    return {
      arcs: [],
      currentQuarterFocus: {
        themes: [],
        bigThree: [],
      },
    };
  }
}



