// Strategic Mind v1 - Goal Model Management
// lib/strategic_mind/v1/goal_model.ts

import { supabaseAdmin } from '@/lib/supabase';
import { StrategicTimescale } from './types';

async function resolveUserId(clerkId: string): Promise<string> {
  const { data: userRow } = await supabaseAdmin
    .from("users")
    .select("id")
    .eq("clerk_id", clerkId)
    .maybeSingle();

  return userRow?.id || clerkId;
}

export interface GoalHierarchyInput {
  timescale: StrategicTimescale;
  parentGoalId?: string | null;
  title: string;
  description?: string;
  importance?: number;
  strategicWeight?: number;
  alignment?: any;
  feasibility?: any;
  dependencies?: any;
  blockers?: any;
  tags?: string[];
}

export async function upsertGoalInHierarchy(
  userId: string,
  input: GoalHierarchyInput
) {
  const dbUserId = await resolveUserId(userId);

  const payload = {
    user_id: dbUserId,
    timescale: input.timescale,
    parent_goal_id: input.parentGoalId ?? null,
    title: input.title,
    description: input.description ?? null,
    importance: input.importance ?? 0.5,
    strategic_weight: input.strategicWeight ?? 0.5,
    alignment: input.alignment ?? null,
    feasibility: input.feasibility ?? null,
    dependencies: input.dependencies ?? null,
    blockers: input.blockers ?? null,
    tags: input.tags ?? [],
    status: 'active',
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await supabaseAdmin
    .from('goal_hierarchy')
    .insert(payload)
    .select('id');

  if (error) throw error;
  return data?.[0]?.id as string;
}

export async function getGoalHierarchyForUser(
  userId: string,
  timescale?: StrategicTimescale
) {
  const dbUserId = await resolveUserId(userId);

  let query = supabaseAdmin
    .from('goal_hierarchy')
    .select('*')
    .eq('user_id', dbUserId)
    .eq('status', 'active');

  if (timescale) {
    query = query.eq('timescale', timescale);
  }

  const { data, error } = await query.order('timescale', { ascending: true })
    .order('importance', { ascending: false });

  if (error) throw error;
  return data ?? [];
}


