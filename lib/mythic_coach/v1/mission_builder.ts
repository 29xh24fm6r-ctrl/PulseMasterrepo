// Mythic Coach v1 - Mission Builder
// lib/mythic_coach/v1/mission_builder.ts

import "server-only";
import { supabaseAdmin } from '@/lib/supabase/admin';
import { callAIJson } from '@/lib/ai/call';
import { MYTHIC_MISSION_PROMPT } from './prompts';

async function resolveUserId(clerkId: string): Promise<string> {
  const { data: userRow } = await supabaseAdmin
    .from("users")
    .select("id")
    .eq("clerk_id", clerkId)
    .maybeSingle();

  return userRow?.id || clerkId;
}

export async function generateWeeklyMissionsForPlan(
  userId: string,
  planId: string,
  weekStart: Date
) {
  const dbUserId = await resolveUserId(userId);

  const { data: plan, error: planError } = await supabaseAdmin
    .from('mythic_training_plans')
    .select('*')
    .eq('id', planId)
    .eq('user_id', dbUserId)
    .maybeSingle();

  if (planError) throw planError;
  if (!plan) throw new Error('Plan not found');

  const archetypeId = plan.archetype_id;

  // Get user context for mission generation
  const [canonSnapshotRes] = await Promise.all([
    supabaseAdmin
      .from('life_canon_snapshots')
      .select('*')
      .eq('user_id', dbUserId)
      .order('snapshot_time', { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  const canonSnapshot = canonSnapshotRes.data;

  const result = await callAIJson<{
    missions: Array<{
      title: string;
      description?: string;
      cadence: 'daily' | 'weekly' | 'once' | 'custom';
      estimatedEffortMinutes?: number;
      tags?: string[];
      xpValue?: number;
    }>;
  }>({
    userId,
    feature: 'mythic_missions',
    systemPrompt: MYTHIC_MISSION_PROMPT,
    userPrompt: `Context:\n${JSON.stringify({
      archetypeId,
      plan,
      canonSnapshot,
      weekStart: weekStart.toISOString(),
    }, null, 2)}`,
    maxTokens: 3000,
    temperature: 0.7,
  });

  if (!result.success || !result.data) {
    throw new Error(`Failed to generate missions: ${result.error}`);
  }

  const { missions } = result.data;

  if (!missions || !missions.length) return [];

  const weekStartDate = new Date(weekStart);
  const rows = missions.map((m, idx) => {
    const due = new Date(weekStartDate);
    // Simple: stagger dailies over week by index
    due.setDate(due.getDate() + (idx % 7));

    return {
      user_id: dbUserId,
      archetype_id: archetypeId,
      plan_id: planId,
      title: m.title,
      description: m.description ?? '',
      cadence: m.cadence ?? 'daily',
      estimated_effort_minutes: m.estimatedEffortMinutes ?? 10,
      xp_value: m.xpValue ?? 10,
      tags: m.tags ?? [],
      due_date: due.toISOString().slice(0, 10),
      status: 'pending',
    };
  });

  const { data, error } = await supabaseAdmin
    .from('mythic_training_missions')
    .insert(rows)
    .select('*');

  if (error) throw error;
  return data ?? [];
}


