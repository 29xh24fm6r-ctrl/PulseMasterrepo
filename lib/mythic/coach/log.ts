// Mythic Coach Engine v1 - Session Logging
// lib/mythic/coach/log.ts

import { supabaseAdminClient } from '../../supabase/admin';
import { MythicContext, MythicCoachMode, MythicPlaybook } from './types';

async function resolveUserId(clerkId: string): Promise<string> {
  const { data: userRow } = await supabaseAdminClient
    .from("users")
    .select("id")
    .eq("clerk_id", clerkId)
    .maybeSingle();

  return userRow?.id || clerkId;
}

export async function logMythicCoachSession(params: {
  userId: string;
  mode: MythicCoachMode;
  source: string;
  context: MythicContext;
  dealId?: string;
  dealArchetypeRunId?: string;
  response: string;
  usedPlaybooks: MythicPlaybook[];
  inputSummary?: string;
}): Promise<void> {
  const dbUserId = await resolveUserId(params.userId);

  const { error } = await supabaseAdminClient
    .from('mythic_coach_sessions')
    .insert({
      user_id: dbUserId,
      mode: params.mode,
      source: params.source,
      life_chapter_id: params.context.currentChapter?.id ?? null,
      dominant_archetype_id: params.context.mythicProfile?.dominant_life_archetypes?.[0]?.archetype_id ?? null,
      deal_id: params.dealId ?? null,
      deal_archetype_run_id: params.dealArchetypeRunId ?? null,
      input_summary: params.inputSummary ?? null,
      coach_response: params.response,
      used_playbook_ids: params.usedPlaybooks.map((pb) => pb.id),
      insights: [],
    });

  if (error) throw error;
}


