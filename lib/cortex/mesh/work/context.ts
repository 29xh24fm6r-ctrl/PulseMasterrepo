// Work Domain Context Builder (Mesh v2)
// lib/cortex/mesh/work/context.ts

import { buildTodayQueue } from "@/lib/productivity/queue";
import { supabaseAdmin } from "@/lib/supabase";
import { PulseDomainContext } from "@/lib/cortex/types";

/**
 * Build work domain context for Cognitive Mesh
 */
export async function buildWorkContext(
  userId: string
): Promise<PulseDomainContext["work"]> {
  try {
    const { data: userRow } = await supabaseAdmin
      .from("users")
      .select("id")
      .eq("clerk_id", userId)
      .maybeSingle();

    const dbUserId = userRow?.id || userId;

    // Get today's queue with full EF analysis
    const queue = await buildTodayQueue(userId, {
      includeThirdBrain: true,
      includeEFAnalysis: true,
    });

    // Get active projects
    const { data: projects } = await supabaseAdmin
      .from("projects")
      .select("id, name, description, updated_at")
      .eq("user_id", dbUserId)
      .eq("status", "active")
      .order("updated_at", { ascending: false })
      .limit(10);

    // Count focus sessions today
    const today = new Date().toISOString().split("T")[0];
    const { count: focusSessions } = await supabaseAdmin
      .from("focus_sessions")
      .select("*", { count: "exact", head: true })
      .eq("user_id", dbUserId)
      .gte("started_at", today);

    return {
      queue,
      activeProjects: (projects || []).map((p) => ({
        id: p.id,
        name: p.name,
        description: p.description || undefined,
        lastActivityAt: p.updated_at,
      })),
      focusSessions: focusSessions || 0,
    };
  } catch (err) {
    console.warn("[WorkMesh] Failed to build context:", err);
    return {
      queue: [],
      activeProjects: [],
      focusSessions: 0,
    };
  }
}



