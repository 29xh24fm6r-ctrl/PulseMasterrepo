// Mythic Coach v1 - Reflection Engine
// lib/mythic_coach/v1/reflection_engine.ts

import "server-only";
import { supabaseAdmin } from '@/lib/supabase/admin';
import { callAIJson } from '@/lib/ai/call';
import { MYTHIC_REFLECTION_PROMPT } from './prompts';

async function resolveUserId(clerkId: string): Promise<string> {
  const { data: userRow } = await supabaseAdmin
    .from("users")
    .select("id")
    .eq("clerk_id", clerkId)
    .maybeSingle();

  return userRow?.id || clerkId;
}

export async function runMythicReflectionForWeek(
  userId: string,
  archetypeId: string,
  periodStart: Date,
  periodEnd: Date
) {
  const dbUserId = await resolveUserId(userId);
  const startStr = periodStart.toISOString().slice(0, 10);
  const endStr = periodEnd.toISOString().slice(0, 10);

  const [missionsRes, eventsRes, snapshotRes] = await Promise.all([
    supabaseAdmin
      .from('mythic_training_missions')
      .select('*')
      .eq('user_id', dbUserId)
      .eq('archetype_id', archetypeId)
      .gte('due_date', startStr)
      .lte('due_date', endStr),
    supabaseAdmin
      .from('canon_events')
      .select('*')
      .eq('user_id', dbUserId)
      .gte('created_at', startStr)
      .lte('created_at', endStr),
    supabaseAdmin
      .from('archetype_snapshots')
      .select('*')
      .eq('user_id', dbUserId)
      .order('snapshot_time', { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  const missions = missionsRes.data ?? [];
  const events = eventsRes.data ?? [];
  const archetypeSnapshot = snapshotRes.data;

  const result = await callAIJson<{
    coachRating: number;
    wins: string[];
    challenges: string[];
    adjustments: string[];
  }>({
    userId,
    feature: 'mythic_reflection',
    systemPrompt: MYTHIC_REFLECTION_PROMPT,
    userPrompt: `Context:\n${JSON.stringify({
      archetypeId,
      missions,
      events,
      archetypeSnapshot,
      periodStart: startStr,
      periodEnd: endStr,
    }, null, 2)}`,
    maxTokens: 2000,
    temperature: 0.7,
  });

  if (!result.success || !result.data) {
    throw new Error(`Failed to run reflection: ${result.error}`);
  }

  const { coachRating, wins, challenges, adjustments } = result.data;

  const { error } = await supabaseAdmin
    .from('mythic_training_reflections')
    .insert({
      user_id: dbUserId,
      archetype_id: archetypeId,
      period_start: startStr,
      period_end: endStr,
      self_rating: null,
      coach_rating: coachRating ?? null,
      wins: wins ?? [],
      challenges: challenges ?? [],
      adjustments: adjustments ?? [],
    });

  if (error) throw error;

  return { coachRating, wins, challenges, adjustments };
}


