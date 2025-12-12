// Strategic Mind - Conflict Detection
// lib/strategic_mind/conflict_detection.ts

import { supabaseAdmin } from '@/lib/supabase';
import { callAIJson } from '@/lib/ai/call';
import { aggregateSubsystemSignalsForUser } from './aggregate';
import { STRATEGIC_CONFLICT_DETECTION_PROMPT } from './prompts';
import { StrategicConflict } from './types';

async function resolveUserId(clerkId: string): Promise<string> {
  const { data: userRow } = await supabaseAdmin
    .from("users")
    .select("id")
    .eq("clerk_id", clerkId)
    .maybeSingle();

  return userRow?.id || clerkId;
}

export async function detectStrategicConflicts(userId: string, now: Date) {
  const dbUserId = await resolveUserId(userId);

  // Get latest strategic snapshot
  const { data: latestSnapshot } = await supabaseAdmin
    .from('strategic_state_snapshots')
    .select('*')
    .eq('user_id', dbUserId)
    .order('snapshot_time', { ascending: false })
    .limit(1);

  if (!latestSnapshot?.[0]) {
    console.warn('[Strategic Mind] No snapshot found for conflict detection');
    return [];
  }

  // Aggregate current signals
  const signals = await aggregateSubsystemSignalsForUser(userId, now);

  const result = await callAIJson<{
    conflicts: StrategicConflict[];
  }>({
    userId,
    feature: 'strategic_mind_conflicts',
    systemPrompt: STRATEGIC_CONFLICT_DETECTION_PROMPT,
    userPrompt: JSON.stringify({
      snapshot: latestSnapshot[0],
      signals,
    }, null, 2),
    maxTokens: 3000,
    temperature: 0.7,
  });

  if (!result.success || !result.data) {
    console.error('[Strategic Mind] Failed to detect conflicts', result.error);
    return [];
  }

  const { conflicts } = result.data;

  if (!conflicts?.length) return [];

  // Store conflicts
  const rows = conflicts.map((c) => ({
    user_id: dbUserId,
    conflict_type: c.conflictType,
    description: c.description,
    severity: c.severity ?? 0.5,
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


