// Council Storage Helpers
// lib/council/storage.ts

import { supabaseAdmin } from "@/lib/supabase";
import { CouncilMember, CouncilAnalysis, CouncilSynthesis } from "./types";

export interface CreateSessionParams {
  userId?: string;
  primaryCoachId: string;
  mode: string;
  reason: string;
  requestId?: string;
}

/**
 * Create council session
 */
export async function createSession(
  params: CreateSessionParams
): Promise<{ id: string }> {
  // Get user's database ID if provided
  let dbUserId = params.userId;
  if (params.userId) {
    const { data: userRow } = await supabaseAdmin
      .from("users")
      .select("id")
      .eq("clerk_id", params.userId)
      .maybeSingle();

    dbUserId = userRow?.id || params.userId;
  }

  const { data, error } = await supabaseAdmin
    .from("coach_council_sessions")
    .insert({
      user_id: dbUserId || null,
      primary_coach_id: params.primaryCoachId,
      council_mode: params.mode,
      trigger_reason: params.reason,
      request_id: params.requestId || null,
    })
    .select("id")
    .single();

  if (error || !data) {
    throw new Error(`Failed to create council session: ${error?.message}`);
  }

  return { id: data.id };
}

/**
 * Save council members
 */
export async function saveMembers(
  sessionId: string,
  roster: CouncilMember[]
): Promise<void> {
  const members = roster.map((member) => ({
    session_id: sessionId,
    coach_id: member.coachId,
    role: member.role,
    weight: member.weight,
    persona_id: (member as any).personaId || null,
  }));

  const { error } = await supabaseAdmin
    .from("coach_council_members")
    .insert(members);

  if (error) {
    console.error("[CouncilStorage] Failed to save members:", error);
    throw error;
  }
}

/**
 * Save deliberation
 */
export async function saveDeliberation(
  sessionId: string,
  analysis: CouncilAnalysis
): Promise<void> {
  const { error } = await supabaseAdmin
    .from("coach_council_deliberations")
    .insert({
      session_id: sessionId,
      coach_id: analysis.coachId,
      phase: "analysis",
      content: {
        analysis: analysis.analysis,
        key_concerns: analysis.keyConcerns,
        recommended_steps: analysis.recommendedSteps,
        risks: analysis.risks,
      } as any,
    });

  if (error) {
    console.error("[CouncilStorage] Failed to save deliberation:", error);
    throw error;
  }
}

/**
 * Save summary
 */
export async function saveSummary(
  sessionId: string,
  synthesis: CouncilSynthesis,
  finalAnswer: string
): Promise<void> {
  const { error } = await supabaseAdmin
    .from("coach_council_summary")
    .upsert(
      {
        session_id: sessionId,
        final_answer: finalAnswer,
        summary_json: synthesis as any,
      },
      {
        onConflict: "session_id",
      }
    );

  if (error) {
    console.error("[CouncilStorage] Failed to save summary:", error);
    throw error;
  }
}

