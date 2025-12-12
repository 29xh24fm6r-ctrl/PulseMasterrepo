// Strategic Mind v1 - Conflict Detection
// lib/strategic_mind/v1/conflict_detection.ts

import { supabaseAdmin } from '@/lib/supabase';
import { callAIJson } from '@/lib/ai/call';
import { StrategicSignalBundle, StrategicConflict } from './types';
import { STRATEGIC_CONFLICTS_PROMPT } from './prompts';

async function resolveUserId(clerkId: string): Promise<string> {
  const { data: userRow } = await supabaseAdmin
    .from("users")
    .select("id")
    .eq("clerk_id", clerkId)
    .maybeSingle();

  return userRow?.id || clerkId;
}

export async function detectStrategicConflicts(
  userId: string,
  bundle: StrategicSignalBundle
): Promise<StrategicConflict[]> {
  const dbUserId = await resolveUserId(userId);

  const result = await callAIJson<{ conflicts: StrategicConflict[] }>({
    userId,
    feature: 'strategic_mind_conflicts',
    systemPrompt: STRATEGIC_CONFLICTS_PROMPT,
    userPrompt: JSON.stringify(bundle, null, 2),
    maxTokens: 3000,
    temperature: 0.7,
  });

  if (!result.success || !result.data) {
    console.error('[Strategic Mind] Failed to detect conflicts', result.error);
    return [];
  }

  const { conflicts } = result.data;

  if (!conflicts?.length) return [];

  const rows = conflicts.map((c) => ({
    user_id: dbUserId,
    conflict_type: c.conflictType,
    description: c.description,
    severity: c.severity ?? 0.5,
    timescale: c.timescale ?? null,
    involved_goals: c.involvedGoals ?? [],
    subsystem_inputs: c.subsystemInputs ?? {},
    recommended_resolutions: c.recommendedResolutions ?? [],
  }));

  const { error } = await supabaseAdmin
    .from('strategic_conflicts')
    .insert(rows);

  if (error) throw error;

  return conflicts;
}


