// Universal Memory Layer v4
// lib/memory/universal.ts

import { supabaseAdmin } from "@/lib/supabase";

export interface UniversalUserModel {
  identities: string[];
  values: string[];
  recurring_goals: string[];
  behavior_patterns: any;
  emotional_patterns: any;
  relationship_patterns: any;
  work_patterns: any;
  risk_flags: string[];
  growth_edges: string[];
}

/**
 * Build universal user model from all memory sources
 */
export async function buildUniversalUserModel(
  userId: string
): Promise<UniversalUserModel> {
  // Get user's database ID
  const { data: userRow } = await supabaseAdmin
    .from("users")
    .select("id")
    .eq("clerk_id", userId)
    .single();

  const dbUserId = userRow?.id || userId;

  const model: UniversalUserModel = {
    identities: [],
    values: [],
    recurring_goals: [],
    behavior_patterns: {},
    emotional_patterns: {},
    relationship_patterns: {},
    work_patterns: {},
    risk_flags: [],
    growth_edges: [],
  };

  // Load identities
  const { data: identities } = await supabaseAdmin
    .from("identities")
    .select("name")
    .eq("user_id", dbUserId)
    .eq("is_active", true);

  model.identities = (identities || []).map((i) => i.name);

  // Load values (from identity_values or similar)
  const { data: values } = await supabaseAdmin
    .from("identity_values")
    .select("value_name")
    .eq("user_id", dbUserId);

  model.values = (values || []).map((v) => v.value_name);

  // Load behavior patterns (from power_patterns)
  const { data: patterns } = await supabaseAdmin
    .from("power_patterns")
    .select("*")
    .eq("user_id", dbUserId)
    .order("frequency", { ascending: false })
    .limit(10);

  model.behavior_patterns = patterns || [];

  // Load emotional patterns (from emo_states aggregated)
  const { data: emotions } = await supabaseAdmin
    .from("emo_states")
    .select("detected_emotion, intensity")
    .eq("user_id", dbUserId)
    .gte("occurred_at", new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString());

  if (emotions && emotions.length > 0) {
    const emotionCounts: Record<string, number> = {};
    for (const e of emotions) {
      if (e.detected_emotion) {
        emotionCounts[e.detected_emotion] = (emotionCounts[e.detected_emotion] || 0) + 1;
      }
    }
    model.emotional_patterns = emotionCounts;
  }

  // Load relationship patterns (from contact_relationship_scores aggregated)
  const { data: relationships } = await supabaseAdmin
    .from("contact_relationship_scores")
    .select("trust_score, influence_score, warmth_score")
    .eq("user_id", dbUserId);

  if (relationships && relationships.length > 0) {
    const avgTrust =
      relationships.reduce((sum, r) => sum + (r.trust_score || 0), 0) /
      relationships.length;
    const avgInfluence =
      relationships.reduce((sum, r) => sum + (r.influence_score || 0), 0) /
      relationships.length;

    model.relationship_patterns = {
      avg_trust: avgTrust,
      avg_influence: avgInfluence,
      total_relationships: relationships.length,
    };
  }

  // Load work patterns (from deals, tasks)
  const { data: deals } = await supabaseAdmin
    .from("deals")
    .select("status, value")
    .eq("user_id", dbUserId);

  const activeDeals = (deals || []).filter((d) => d.status === "active").length;
  const totalValue = (deals || []).reduce((sum, d) => sum + (d.value || 0), 0);

  // Tasks completed (last 30 days)
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const { count: tasksCompleted } = await supabaseAdmin
    .from("tasks")
    .select("*", { count: "exact", head: true })
    .eq("user_id", dbUserId)
    .eq("status", "done")
    .gte("updated_at", thirtyDaysAgo.toISOString());

  model.work_patterns = {
    active_deals: activeDeals,
    total_pipeline_value: totalValue,
    tasks_completed_30d: tasksCompleted || 0,
  };

  // Load risk flags (from behavior_predictions, interventions)
  const { data: predictions } = await supabaseAdmin
    .from("behavior_predictions")
    .select("risk_type, recommended_action")
    .eq("user_id", dbUserId)
    .eq("prediction_date", new Date().toISOString().split("T")[0])
    .gte("risk_score", 0.5); // High/medium risk

  model.risk_flags = (predictions || []).map((p) => p.recommended_action || p.risk_type || "risk");

  // Growth edges (from identity_snapshots, life_chapters)
  const { data: chapters } = await supabaseAdmin
    .from("life_chapters")
    .select("emotion_theme, description")
    .eq("user_id", dbUserId)
    .order("start_date", { ascending: false })
    .limit(1);

  if (chapters && chapters.length > 0) {
    model.growth_edges = [chapters[0].emotion_theme || "growth"];
  }

  return model;
}

/**
 * Query universal memory for relevant nuggets
 */
export async function queryUniversalMemory(
  userId: string,
  queryContext: string
): Promise<Array<{ content: string; source: string; relevance: number }>> {
  // Get user's database ID
  const { data: userRow } = await supabaseAdmin
    .from("users")
    .select("id")
    .eq("clerk_id", userId)
    .single();

  const dbUserId = userRow?.id || userId;

  const nuggets: Array<{ content: string; source: string; relevance: number }> = [];

  // Search third brain memories
  const { data: memories } = await supabaseAdmin
    .from("third_brain_memories")
    .select("content, created_at")
    .eq("user_id", dbUserId)
    .ilike("content", `%${queryContext}%`)
    .order("created_at", { ascending: false })
    .limit(5);

  for (const mem of memories || []) {
    nuggets.push({
      content: mem.content?.substring(0, 200) || "",
      source: "third_brain",
      relevance: 0.8,
    });
  }

  // Search journal entries (if you have a journal table)
  // This would need to be implemented based on your actual schema

  return nuggets.slice(0, 10);
}

