// Memory-Infused Personalities
// lib/personas/memory.ts

import { supabaseAdmin } from "@/lib/supabase";
import { PersonaProfile, ToneMatrix } from "./types";

export interface PersonaUserState {
  id: string;
  user_id: string;
  persona_id: string;
  coach_id: string | null;
  usage_count: number;
  last_used_at: string | null;
  avg_energy_delta: number;
  avg_warmth_delta: number;
  avg_directiveness_delta: number;
  preferred_pacing: string | null;
  preferred_sentence_length: string | null;
  preferred_stage: string | null;
  rejection_count: number;
  approval_count: number;
  notes: Record<string, any>;
  personality_bias: Record<string, any>;
}

export interface UpdatePersonaUserStateParams {
  userId: string;
  personaId: string;
  coachId?: string;
  feedback?: "like" | "dislike" | null;
  tuningApplied?: Partial<ToneMatrix>;
  implicitSignals?: Record<string, any>;
  outcomeTag?: string;
}

/**
 * Get persona user state
 */
export async function getPersonaUserState(
  userId: string,
  personaId: string,
  coachId?: string
): Promise<PersonaUserState | null> {
  // Get user's database ID
  const { data: userRow } = await supabaseAdmin
    .from("users")
    .select("id")
    .eq("clerk_id", userId)
    .single();

  const dbUserId = userRow?.id || userId;

  const { data } = await supabaseAdmin
    .from("persona_user_state")
    .select("*")
    .eq("user_id", dbUserId)
    .eq("persona_id", personaId)
    .eq("coach_id", coachId || null)
    .maybeSingle();

  return data as PersonaUserState | null;
}

/**
 * Update persona user state
 */
export async function updatePersonaUserState(
  params: UpdatePersonaUserStateParams
): Promise<void> {
  // Get user's database ID
  const { data: userRow } = await supabaseAdmin
    .from("users")
    .select("id")
    .eq("clerk_id", params.userId)
    .single();

  const dbUserId = userRow?.id || params.userId;

  // Get current state
  const current = await getPersonaUserState(
    params.userId,
    params.personaId,
    params.coachId
  );

  // Calculate deltas
  const updates: Partial<PersonaUserState> = {
    usage_count: (current?.usage_count || 0) + 1,
    last_used_at: new Date().toISOString(),
  };

  // Apply feedback
  if (params.feedback === "like") {
    updates.approval_count = (current?.approval_count || 0) + 1;
    
    // Reinforce current tuning (small positive adjustment)
    if (params.tuningApplied) {
      if (params.tuningApplied.energy !== undefined) {
        updates.avg_energy_delta = Math.max(
          -25,
          Math.min(25, (current?.avg_energy_delta || 0) + 2)
        );
      }
      if (params.tuningApplied.warmth !== undefined) {
        updates.avg_warmth_delta = Math.max(
          -25,
          Math.min(25, (current?.avg_warmth_delta || 0) + 2)
        );
      }
      if (params.tuningApplied.directiveness !== undefined) {
        updates.avg_directiveness_delta = Math.max(
          -25,
          Math.min(25, (current?.avg_directiveness_delta || 0) + 2)
        );
      }
    }
  } else if (params.feedback === "dislike") {
    updates.rejection_count = (current?.rejection_count || 0) + 1;
    
    // Dampen current tuning (small negative adjustment)
    if (params.tuningApplied) {
      if (params.tuningApplied.energy !== undefined) {
        updates.avg_energy_delta = Math.max(
          -25,
          Math.min(25, (current?.avg_energy_delta || 0) - 3)
        );
      }
      if (params.tuningApplied.warmth !== undefined) {
        updates.avg_warmth_delta = Math.max(
          -25,
          Math.min(25, (current?.avg_warmth_delta || 0) - 3)
        );
      }
      if (params.tuningApplied.directiveness !== undefined) {
        updates.avg_directiveness_delta = Math.max(
          -25,
          Math.min(25, (current?.avg_directiveness_delta || 0) - 3)
        );
      }
    }
  }

  // Apply implicit signals
  if (params.implicitSignals) {
    if (params.implicitSignals.length === "too_long") {
      updates.preferred_sentence_length = "short";
    } else if (params.implicitSignals.length === "too_short") {
      updates.preferred_sentence_length = "long";
    }

    if (params.implicitSignals.user_interrupt === true) {
      // User interrupted - prefer faster pacing
      updates.preferred_pacing = "fast";
    }
  }

  // Merge personality bias
  const personalityBias = {
    ...(current?.personality_bias || {}),
    ...(params.tuningApplied || {}),
  };
  updates.personality_bias = personalityBias;

  // Log interaction
  await supabaseAdmin.from("persona_interaction_log").insert({
    user_id: dbUserId,
    persona_id: params.personaId,
    coach_id: params.coachId || null,
    emotion_state: params.implicitSignals?.emotion || null,
    outcome_tag: params.outcomeTag || null,
    explicit_feedback: params.feedback || null,
    implicit_signals: params.implicitSignals || {},
    tuning_applied: params.tuningApplied || {},
  });

  // Upsert state
  await supabaseAdmin
    .from("persona_user_state")
    .upsert(
      {
        user_id: dbUserId,
        persona_id: params.personaId,
        coach_id: params.coachId || null,
        ...updates,
        updated_at: new Date().toISOString(),
      },
      {
        onConflict: "user_id,persona_id,coach_id",
      }
    );
}

/**
 * Apply user state to persona
 */
export function applyUserStateToPersona(
  basePersona: PersonaProfile,
  userState: PersonaUserState | null
): PersonaProfile {
  if (!userState) return basePersona;

  const adjusted = { ...basePersona };
  const style = { ...basePersona.style };

  // Apply numeric deltas
  style.energy = Math.max(
    0,
    Math.min(100, style.energy + (userState.avg_energy_delta || 0))
  );
  style.warmth = Math.max(
    0,
    Math.min(100, style.warmth + (userState.avg_warmth_delta || 0))
  );
  style.directiveness = Math.max(
    0,
    Math.min(100, style.directiveness + (userState.avg_directiveness_delta || 0))
  );

  // Apply preferred overrides
  if (userState.preferred_pacing) {
    style.pacing = userState.preferred_pacing as any;
  }
  if (userState.preferred_sentence_length) {
    style.sentence_length = userState.preferred_sentence_length as any;
  }

  // Apply personality bias
  if (userState.personality_bias) {
    Object.entries(userState.personality_bias).forEach(([key, value]) => {
      if (typeof value === "number" && key in style) {
        (style as any)[key] = Math.max(0, Math.min(100, (style as any)[key] + value));
      }
    });
  }

  adjusted.style = style;
  return adjusted;
}




