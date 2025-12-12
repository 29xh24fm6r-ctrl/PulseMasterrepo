// Meta-Planner Session Builder
// lib/meta_planner/session.ts

import { supabaseAdmin } from '@/lib/supabase';
import { PlanningContextInput } from './types';

async function resolveUserId(clerkId: string): Promise<string> {
  const { data: userRow } = await supabaseAdmin
    .from("users")
    .select("id")
    .eq("clerk_id", clerkId)
    .maybeSingle();

  return userRow?.id || clerkId;
}

export async function createPlanningSession(
  userId: string,
  ctx: PlanningContextInput
) {
  const dbUserId = await resolveUserId(userId);

  const { data, error } = await supabaseAdmin
    .from('planning_sessions')
    .insert({
      user_id: dbUserId,
      kind: ctx.kind,
      trigger_source: ctx.triggerSource,
      context: {
        consciousFrameId: ctx.consciousFrame?.id ?? null,
        conflictIds: ctx.conflicts?.map((c: any) => c.id) ?? [],
      },
      // alignment_score, stress_budget, energy_budget filled by engine later
    })
    .select('id');

  if (error) throw error;
  return data?.[0]?.id as string;
}


