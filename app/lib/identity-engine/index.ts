// Identity Engine v2 Core Library
// Deep self-understanding: values, strengths, growth areas, life narrative

import { getSupabaseAdminRuntimeClient, getSupabaseRuntimeClient } from "@/lib/runtime/supabase.runtime";
import { llmJson, llmComplete } from "@/lib/llm/client";

function getSupabase() {
  return getSupabaseAdminRuntimeClient();
}

// ============================================
// TYPES
// ============================================

export interface Value {
  id: string;
  user_id: string;
  value_name: string;
  description?: string;
  importance_rank?: number;
  confidence: number;
  source: string;
  active: boolean;
}

export interface Strength {
  id: string;
  user_id: string;
  strength_name: string;
  category?: string;
  description?: string;
  confidence: number;
  evidence_count: number;
}

export interface GrowthArea {
  id: string;
  user_id: string;
  area_name: string;
  current_level?: number;
  target_level?: number;
  priority: string;
  status: string;
}

export interface Role {
  id: string;
  user_id: string;
  role_name: string;
  importance: number;
  satisfaction?: number;
  aspirations?: string;
}

export interface Aspiration {
  id: string;
  user_id: string;
  aspiration_type: string;
  title: string;
  time_horizon?: string;
  progress: number;
  status: string;
}

export interface IdentityProfile {
  values: Value[];
  strengths: Strength[];
  growth_areas: GrowthArea[];
  roles: Role[];
  aspirations: Aspiration[];
  beliefs: any[];
  narrative_summary?: string;
}

// ============================================
// VALUES
// ============================================

export async function addValue(
  userId: string,
  value: {
    value_name: string;
    description?: string;
    importance_rank?: number;
    source?: string;
  }
): Promise<Value> {
  const supabase = getSupabase();

  const { data, error } = await supabase
    .from("id_values")
    .insert({
      user_id: userId,
      value_name: value.value_name,
      description: value.description,
      importance_rank: value.importance_rank,
      source: value.source || "explicit",
      confidence: value.source === "explicit" ? 0.9 : 0.6,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function getValues(userId: string): Promise<Value[]> {
  const supabase = getSupabase();

  const { data } = await supabase
    .from("id_values")
    .select("*")
    .eq("user_id", userId)
    .eq("active", true)
    .order("importance_rank", { ascending: true, nullsFirst: false });

  return data || [];
}

export async function inferValuesFromBehavior(userId: string): Promise<Value[]> {
  const supabase = getSupabase();

  // Get recent fragments and patterns
  const { data: fragments } = await supabase
    .from("tb_memory_fragments")
    .select("content, fragment_type")
    .eq("user_id", userId)
    .order("occurred_at", { ascending: false })
    .limit(50);

  if (!fragments?.length) return [];

  const content = fragments.map((f) => f.content).join("\n");

  const prompt = `Analyze these user interactions and infer their likely core values:

${content}

Identify 3-5 core values that seem important to this person based on:
- What they spend time on
- What they talk about
- Their priorities and concerns
- Their emotional reactions

Return JSON:
{
  "values": [
    {
      "value_name": "string",
      "description": "why this seems like their value",
      "confidence": 0.0-1.0
    }
  ]
}`;

  try {
   const result = await llmJson({ prompt }); 

    const inferred: Value[] = [];
    for (const v of result.values || []) {
      try {
        const value = await addValue(userId, {
          value_name: v.value_name,
          description: v.description,
          source: "inferred",
        });
        inferred.push(value);
      } catch {
        // Skip duplicates
      }
    }

    return inferred;
  } catch {
    return [];
  }
}

// ============================================
// STRENGTHS
// ============================================

export async function addStrength(
  userId: string,
  strength: {
    strength_name: string;
    category?: string;
    description?: string;
    source?: string;
  }
): Promise<Strength> {
  const supabase = getSupabase();

  const { data, error } = await supabase
    .from("id_strengths")
    .insert({
      user_id: userId,
      strength_name: strength.strength_name,
      category: strength.category,
      description: strength.description,
      source: strength.source || "explicit",
      confidence: 0.7,
      evidence_count: 1,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function getStrengths(userId: string): Promise<Strength[]> {
  const supabase = getSupabase();

  const { data } = await supabase
    .from("id_strengths")
    .select("*")
    .eq("user_id", userId)
    .order("confidence", { ascending: false });

  return data || [];
}

export async function reinforceStrength(
  userId: string,
  strengthId: string
): Promise<void> {
  const supabase = getSupabase();

  const { data: current } = await supabase
    .from("id_strengths")
    .select("evidence_count, confidence")
    .eq("id", strengthId)
    .single();

  if (current) {
    await supabase
      .from("id_strengths")
      .update({
        evidence_count: current.evidence_count + 1,
        confidence: Math.min(1, current.confidence + 0.05),
        last_demonstrated_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", strengthId);
  }
}

// ============================================
// GROWTH AREAS
// ============================================

export async function addGrowthArea(
  userId: string,
  area: {
    area_name: string;
    category?: string;
    current_level?: number;
    target_level?: number;
    priority?: string;
    strategies?: string[];
  }
): Promise<GrowthArea> {
  const supabase = getSupabase();

  const { data, error } = await supabase
    .from("id_growth_areas")
    .insert({
      user_id: userId,
      area_name: area.area_name,
      category: area.category,
      current_level: area.current_level,
      target_level: area.target_level,
      priority: area.priority || "medium",
      strategies: area.strategies || [],
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function getGrowthAreas(userId: string): Promise<GrowthArea[]> {
  const supabase = getSupabase();

  const { data } = await supabase
    .from("id_growth_areas")
    .select("*")
    .eq("user_id", userId)
    .eq("status", "active")
    .order("priority", { ascending: true });

  return data || [];
}

// ============================================
// ROLES
// ============================================

export async function addRole(
  userId: string,
  role: {
    role_name: string;
    description?: string;
    importance?: number;
    aspirations?: string;
  }
): Promise<Role> {
  const supabase = getSupabase();

  const { data, error } = await supabase
    .from("id_roles")
    .insert({
      user_id: userId,
      role_name: role.role_name,
      description: role.description,
      importance: role.importance || 0.5,
      aspirations: role.aspirations,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function getRoles(userId: string): Promise<Role[]> {
  const supabase = getSupabase();

  const { data } = await supabase
    .from("id_roles")
    .select("*")
    .eq("user_id", userId)
    .order("importance", { ascending: false });

  return data || [];
}

// ============================================
// ASPIRATIONS
// ============================================

export async function addAspiration(
  userId: string,
  aspiration: {
    aspiration_type: string;
    title: string;
    description?: string;
    time_horizon?: string;
  }
): Promise<Aspiration> {
  const supabase = getSupabase();

  const { data, error } = await supabase
    .from("id_aspirations")
    .insert({
      user_id: userId,
      aspiration_type: aspiration.aspiration_type,
      title: aspiration.title,
      description: aspiration.description,
      time_horizon: aspiration.time_horizon,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function getAspirations(userId: string): Promise<Aspiration[]> {
  const supabase = getSupabase();

  const { data } = await supabase
    .from("id_aspirations")
    .select("*")
    .eq("user_id", userId)
    .eq("status", "active")
    .order("importance", { ascending: false });

  return data || [];
}

// ============================================
// NARRATIVE
// ============================================

export async function addNarrativeChapter(
  userId: string,
  chapter: {
    chapter_title: string;
    time_period?: string;
    summary: string;
    key_events?: string[];
    lessons_learned?: string[];
    emotional_tone?: string;
  }
): Promise<any> {
  const supabase = getSupabase();

  // Get next chapter order
  const { data: existing } = await supabase
    .from("id_narrative_chapters")
    .select("chapter_order")
    .eq("user_id", userId)
    .order("chapter_order", { ascending: false })
    .limit(1);

  const nextOrder = (existing?.[0]?.chapter_order || 0) + 1;

  const { data, error } = await supabase
    .from("id_narrative_chapters")
    .insert({
      user_id: userId,
      chapter_title: chapter.chapter_title,
      time_period: chapter.time_period,
      summary: chapter.summary,
      key_events: chapter.key_events || [],
      lessons_learned: chapter.lessons_learned || [],
      emotional_tone: chapter.emotional_tone,
      chapter_order: nextOrder,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function getNarrative(userId: string): Promise<any[]> {
  const supabase = getSupabase();

  const { data } = await supabase
    .from("id_narrative_chapters")
    .select("*")
    .eq("user_id", userId)
    .order("chapter_order", { ascending: true });

  return data || [];
}

// ============================================
// FULL PROFILE
// ============================================

export async function getIdentityProfile(userId: string): Promise<IdentityProfile> {
  const [values, strengths, growth_areas, roles, aspirations] = await Promise.all([
    getValues(userId),
    getStrengths(userId),
    getGrowthAreas(userId),
    getRoles(userId),
    getAspirations(userId),
  ]);

  const supabase = getSupabase();
  const { data: beliefs } = await supabase
    .from("id_beliefs")
    .select("*")
    .eq("user_id", userId)
    .limit(20);

  const narrative = await getNarrative(userId);
  const narrativeSummary = narrative
    .map((c) => `${c.chapter_title}: ${c.summary}`)
    .join("\n\n");

  return {
    values,
    strengths,
    growth_areas,
    roles,
    aspirations,
    beliefs: beliefs || [],
    narrative_summary: narrativeSummary || undefined,
  };
}

// ============================================
// AI-POWERED IDENTITY INSIGHTS
// ============================================

export async function generateIdentityInsights(userId: string): Promise<string> {
  const profile = await getIdentityProfile(userId);

  const prompt = `Based on this person's identity profile, generate 2-3 meaningful insights about who they are and how they might grow:

Values: ${profile.values.map((v) => v.value_name).join(", ")}
Strengths: ${profile.strengths.map((s) => s.strength_name).join(", ")}
Growth Areas: ${profile.growth_areas.map((g) => g.area_name).join(", ")}
Roles: ${profile.roles.map((r) => r.role_name).join(", ")}
Aspirations: ${profile.aspirations.map((a) => a.title).join(", ")}

Provide thoughtful, specific insights that connect different aspects of their identity.`;

  const result = await llmComplete(prompt, { temperature: 0.7 });
  return result;
}

// ============================================
// SNAPSHOT
// ============================================

export async function createIdentitySnapshot(
  userId: string,
  data: {
    life_satisfaction?: number;
    authenticity_score?: number;
    growth_focus?: string;
    biggest_challenge?: string;
    biggest_win?: string;
    reflections?: string;
  }
): Promise<any> {
  const supabase = getSupabase();

  const values = await getValues(userId);
  const roles = await getRoles(userId);

  const { data: snapshot, error } = await supabase
    .from("id_snapshots")
    .insert({
      user_id: userId,
      snapshot_date: new Date().toISOString().split("T")[0],
      life_satisfaction: data.life_satisfaction,
      authenticity_score: data.authenticity_score,
      top_values: values.slice(0, 5).map((v) => v.value_name),
      current_roles: roles.map((r) => r.role_name),
      growth_focus: data.growth_focus,
      biggest_challenge: data.biggest_challenge,
      biggest_win: data.biggest_win,
      reflections: data.reflections,
    })
    .select()
    .single();

  if (error) throw error;
  return snapshot;
}

// ============================================
// EXPORTS
// ============================================

export const IdentityEngine = {
  // Values
  addValue,
  getValues,
  inferValuesFromBehavior,
  
  // Strengths
  addStrength,
  getStrengths,
  reinforceStrength,
  
  // Growth
  addGrowthArea,
  getGrowthAreas,
  
  // Roles
  addRole,
  getRoles,
  
  // Aspirations
  addAspiration,
  getAspirations,
  
  // Narrative
  addNarrativeChapter,
  getNarrative,
  
  // Profile
  getIdentityProfile,
  generateIdentityInsights,
  createIdentitySnapshot,
};

export default IdentityEngine;