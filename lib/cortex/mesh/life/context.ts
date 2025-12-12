// Life Domain Context Builder (Mesh v2)
// lib/cortex/mesh/life/context.ts

import { supabaseAdmin } from "@/lib/supabase";
import { PulseDomainContext } from "@/lib/cortex/types";

/**
 * Build life domain context for Cognitive Mesh
 */
export async function buildLifeContext(
  userId: string
): Promise<PulseDomainContext["life"]> {
  try {
    const { data: userRow } = await supabaseAdmin
      .from("users")
      .select("id")
      .eq("clerk_id", userId)
      .maybeSingle();

    const dbUserId = userRow?.id || userId;

    // Get habits
    const { data: habits } = await supabaseAdmin
      .from("habits")
      .select("id, name, completion_rate, current_streak")
      .eq("user_id", dbUserId)
      .eq("status", "active")
      .order("completion_rate", { ascending: false })
      .limit(10);

    const habitsList =
      habits?.map((h) => ({
        id: h.id,
        name: h.name,
        completionRate: h.completion_rate || 0,
        streak: h.current_streak || 0,
      })) || [];

    // Get health signals
    // TODO: Integrate with health tracking system
    const healthSignals: PulseDomainContext["life"]["healthSignals"] = [];

    return {
      habits: habitsList,
      healthSignals,
    };
  } catch (err) {
    console.warn("[LifeMesh] Failed to build context:", err);
    return {
      habits: [],
      healthSignals: [],
    };
  }
}



