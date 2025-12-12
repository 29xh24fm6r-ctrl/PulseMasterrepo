// Strategy API Helpers
// lib/strategy/api.ts

import { supabaseAdmin } from "@/lib/supabase";
import { buildStrategySnapshot } from "./planner";

/**
 * Get current strategy snapshot
 */
export async function getCurrentStrategy(userId: string, horizonDays: number = 90): Promise<any> {
  // Get user's database ID
  const { data: userRow } = await supabaseAdmin
    .from("users")
    .select("id")
    .eq("clerk_id", userId)
    .single();

  const dbUserId = userRow?.id || userId;

  // Get latest snapshot
  const { data: snapshot } = await supabaseAdmin
    .from("strategy_snapshots")
    .select("*")
    .eq("user_id", dbUserId)
    .eq("horizon_days", horizonDays)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!snapshot) {
    return null;
  }

  // Get selected path
  const { data: selectedPath } = await supabaseAdmin
    .from("strategy_paths")
    .select("*")
    .eq("snapshot_id", snapshot.id)
    .eq("is_selected", true)
    .single();

  if (!selectedPath) {
    return null;
  }

  // Get pillars
  const { data: pillars } = await supabaseAdmin
    .from("strategy_pillars")
    .select("*")
    .eq("snapshot_id", snapshot.id)
    .eq("path_id", selectedPath.id)
    .order("priority", { ascending: true });

  // Get actions for each pillar
  const pillarsWithActions = [];
  if (pillars) {
    for (const pillar of pillars) {
      const { data: actions } = await supabaseAdmin
        .from("strategy_actions")
        .select("*")
        .eq("pillar_id", pillar.id);

      pillarsWithActions.push({
        id: pillar.id,
        title: pillar.title,
        description: pillar.description,
        category: pillar.category,
        priority: pillar.priority,
        actions: (actions || []).map((a) => ({
          id: a.id,
          title: a.title,
          description: a.description,
          cadence: a.cadence,
          lifeArcId: a.life_arc_id,
        })),
      });
    }
  }

  return {
    snapshotId: snapshot.id,
    horizonDays: snapshot.horizon_days,
    summary: snapshot.summary,
    selectedPath: {
      key: selectedPath.key,
      name: selectedPath.name,
      description: selectedPath.description,
      pros: selectedPath.pros,
      cons: selectedPath.cons,
      riskLevel: selectedPath.risk_level,
      opportunityLevel: selectedPath.opportunity_level,
    },
    pillars: pillarsWithActions,
    createdAt: snapshot.created_at,
  };
}




