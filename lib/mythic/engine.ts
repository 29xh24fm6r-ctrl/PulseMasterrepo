// lib/mythic/engine.ts

import { supabaseServer } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase";
import { ACT_LABELS, type MythicAct } from "./constants";

export type { MythicAct };

/**
 * Resolve Clerk ID to database user UUID
 */
async function resolveUserId(clerkId: string): Promise<string> {
  const { data: userRow } = await supabaseAdmin
    .from("users")
    .select("id")
    .eq("clerk_id", clerkId)
    .maybeSingle();

  return userRow?.id || clerkId;
}

export async function getActiveArc(userId: string) {
  const sb = supabaseServer();
  const dbUserId = await resolveUserId(userId);
  
  // Try mythic_arcs first, fall back to checking if table exists
  const { data, error } = await sb
    .from("mythic_arcs")
    .select("*")
    .eq("user_id", dbUserId)
    .eq("status", "active")
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  // If table doesn't exist or no arc, return null
  if (error && error.code !== 'PGRST116') throw error; // PGRST116 = relation does not exist
  return data ?? null;
}

export async function getMythicState(userId: string) {
  const sb = supabaseServer();
  const arc = await getActiveArc(userId);

  if (!arc) {
    return {
      activeArc: null,
      actLabel: null,
      dominantTrial: null,
      shadowLine: null,
      activeQuestCount: 0,
      latestSession: null,
    };
  }

  const dbUserId = await resolveUserId(userId);

  let latestSession = null;
  try {
    const { data } = await sb
      .from("mythic_sessions")
      .select("*")
      .eq("user_id", dbUserId)
      .eq("arc_id", arc.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    latestSession = data;
  } catch (err) {
    // Table might not exist yet, ignore
  }

  let questCount = 0;
  try {
    const { count } = await sb
      .from("mythic_quests")
      .select("*", { count: "exact", head: true })
      .eq("user_id", dbUserId)
      .eq("arc_id", arc.id)
      .eq("status", "active");
    questCount = count ?? 0;
  } catch (err) {
    // Table might not exist yet, ignore
  }

  const dominantTrial =
    Array.isArray(arc.trials) && arc.trials.length
      ? arc.trials[0]?.title || arc.trials[0] || "A defining trial"
      : "A defining trial";

  const shadowLine = arc.shadow?.pattern
    ? `Shadow: ${arc.shadow.pattern}`
    : "Shadow: unnamed resistance";

  return {
    activeArc: arc,
    actLabel: ACT_LABELS[arc.current_act] ?? `Act ${arc.current_act}`,
    dominantTrial,
    shadowLine,
    activeQuestCount: questCount ?? 0,
    latestSession: latestSession ?? null,
  };
}

export async function saveMythicSession(params: {
  userId: string;
  arcId?: string | null;
  sessionType: string;
  transcript?: string;
  summary?: string;
  extracted?: any;
  quests?: Array<{ title: string; description?: string; difficulty?: number; reward_xp?: number }>;
  rituals?: Array<{ name: string; why?: string; cadence?: string }>;
  canon?: { title?: string; content?: string; tags?: string[] };
}) {
  const sb = supabaseServer();
  const dbUserId = await resolveUserId(params.userId);

  // Insert session
  const { data: session, error: sessErr } = await sb
    .from("mythic_sessions")
    .insert({
      user_id: dbUserId,
      arc_id: params.arcId ?? null,
      session_type: params.sessionType,
      mode: "voice",
      transcript: params.transcript ?? null,
      summary: params.summary ?? null,
      extracted: params.extracted ?? {},
    })
    .select("*")
    .single();

  if (sessErr) throw sessErr;

  // Canon entry
  const canonTitle =
    params.canon?.title ||
    params.summary?.slice(0, 64) ||
    `Mythic Session — ${params.sessionType}`;

  const canonContent =
    params.canon?.content ||
    params.summary ||
    params.transcript ||
    "Session recorded.";

  const tags = params.canon?.tags ?? ["mythic", params.sessionType];

  // Insert canon entry if table exists
  try {
    const { error: canonErr } = await sb.from("life_canon_entries").insert({
      user_id: dbUserId,
      arc_id: params.arcId ?? null,
      session_id: session.id,
      title: canonTitle,
      entry_type: "mythic",
      content: canonContent,
      tags,
      metadata: params.extracted ?? {},
    });
    if (canonErr) throw canonErr;
  } catch (err: any) {
    // Table might not exist, log but don't fail
    console.warn("[Mythic] Could not save canon entry:", err.message);
  }

  // Optional: create quests
  if (Array.isArray(params.quests) && params.quests.length) {
    try {
      const rows = params.quests.map((q) => ({
        user_id: dbUserId,
        arc_id: params.arcId ?? null,
        title: q.title,
        description: q.description ?? null,
        difficulty: q.difficulty ?? 2,
        reward_xp: q.reward_xp ?? 100,
        status: "active",
      }));
      const { error } = await sb.from("mythic_quests").insert(rows);
      if (error) throw error;
    } catch (err: any) {
      console.warn("[Mythic] Could not save quests:", err.message);
    }
  }

  // Optional: create rituals
  if (Array.isArray(params.rituals) && params.rituals.length) {
    try {
      const rows = params.rituals.map((r) => ({
        user_id: dbUserId,
        arc_id: params.arcId ?? null,
        name: r.name,
        why: r.why ?? null,
        cadence: r.cadence ?? "daily",
        status: "active",
      }));
      const { error } = await sb.from("mythic_rituals").insert(rows);
      if (error) throw error;
    } catch (err: any) {
      console.warn("[Mythic] Could not save rituals:", err.message);
    }
  }

  return session;
}

/**
 * Update arc fields based on extraction results
 */
export async function updateArcFromExtraction(
  userId: string,
  arcId: string,
  extracted: {
    act?: 1 | 2 | 3 | 4 | 5;
    shadow?: string | null;
    identity_claim?: string | null;
    transformation?: string | null;
  }
) {
  const sb = supabaseServer();
  const dbUserId = await resolveUserId(userId);

  const updates: any = {};

  // Update act if different
  if (extracted.act !== undefined) {
    updates.current_act = extracted.act;
  }

  // Update shadow if present
  if (extracted.shadow !== undefined && extracted.shadow !== null) {
    // Get current arc to merge shadow
    const { data: currentArc } = await sb
      .from("mythic_arcs")
      .select("shadow")
      .eq("id", arcId)
      .eq("user_id", dbUserId)
      .maybeSingle();

    const currentShadow = currentArc?.shadow || {};
    updates.shadow = {
      ...currentShadow,
      pattern: extracted.shadow,
    };
  }

  // Update identity_claim if present
  if (extracted.identity_claim !== undefined && extracted.identity_claim !== null) {
    updates.identity_claim = extracted.identity_claim;
  }

  // Update transformation if present
  if (extracted.transformation !== undefined && extracted.transformation !== null) {
    updates.transformation = extracted.transformation;
  }

  // Update updated_at
  updates.updated_at = new Date().toISOString();

  // Only update if there are changes
  if (Object.keys(updates).length > 0) {
    const { error } = await sb
      .from("mythic_arcs")
      .update(updates)
      .eq("id", arcId)
      .eq("user_id", dbUserId);

    if (error) {
      console.error("[Mythic Engine] Failed to update arc:", error);
      // Don't throw - allow session to be saved even if arc update fails
    }
  }
}

