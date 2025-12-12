// Goal Persistence Helpers
// lib/agi/goals/store.ts

import { supabaseAdmin } from '@/lib/supabase';
import { CandidateGoal } from './engine';

/**
 * Resolve Clerk ID to database user ID
 */
async function resolveUserId(clerkId: string): Promise<string> {
  const { data: userRow } = await supabaseAdmin
    .from("users")
    .select("id")
    .eq("clerk_id", clerkId)
    .maybeSingle();

  return userRow?.id || clerkId;
}

export async function upsertAGIGoalsFromCandidates(
  userId: string,
  candidates: CandidateGoal[],
): Promise<void> {
  if (!candidates.length) return;
  const dbUserId = await resolveUserId(userId);

  // Strategy: check if equivalent goal already exists (same title+domain+status=active)
  // If exists → skip or update config; if not → insert new row(s).
  for (const goal of candidates) {
    try {
      const { data: existing, error: selectError } = await supabaseAdmin
        .from('agi_goals')
        .select('id, status')
        .eq('user_id', dbUserId)
        .eq('title', goal.title)
        .eq('domain', goal.domain)
        .in('status', ['active', 'paused'])
        .maybeSingle();

      if (selectError) {
        console.error('[AGI][Goals] Failed to query goal', selectError, goal);
        continue;
      }

      if (!existing) {
        const { error: insertError } = await supabaseAdmin.from('agi_goals').insert({
          user_id: dbUserId,
          title: goal.title,
          description: goal.description,
          domain: goal.domain,
          horizon_days: goal.horizonDays,
          config: goal.config ?? {},
          identity_tags: goal.identityTags ?? [],
          source: 'agi',
          status: 'active',
        });

        if (insertError) {
          console.error('[AGI][Goals] Failed to insert goal', insertError, goal);
        } else {
          console.log(`[AGI][Goals] Created new goal: ${goal.title}`);
        }
      } else {
        // Update description/config/etc. if goal exists but might need refresh
        const { error: updateError } = await supabaseAdmin
          .from('agi_goals')
          .update({
            description: goal.description,
            config: goal.config ?? {},
            updated_at: new Date().toISOString(),
          })
          .eq('id', existing.id);

        if (updateError) {
          console.error('[AGI][Goals] Failed to update goal', updateError, goal);
        } else {
          console.log(`[AGI][Goals] Updated existing goal: ${goal.title}`);
        }
      }
    } catch (err: any) {
      console.error('[AGI][Goals] Error processing goal', err, goal);
    }
  }
}

export async function logGoalProgress(
  userId: string,
  updates: {
    goalId: string;
    value?: number;
    progress?: number;
    note?: string;
    snapshotDate?: string;
  }[],
): Promise<void> {
  if (!updates.length) return;
  const dbUserId = await resolveUserId(userId);

  const rows = updates.map((u) => ({
    goal_id: u.goalId,
    user_id: dbUserId,
    value: u.value ?? null,
    progress: u.progress ?? null,
    note: u.note ?? null,
    snapshot_date: u.snapshotDate ?? new Date().toISOString().slice(0, 10),
  }));

  const { error } = await supabaseAdmin.from('agi_goal_progress').insert(rows);
  if (error) {
    console.error('[AGI][Goals] Failed to log goal progress', error);
  } else {
    console.log(`[AGI][Goals] Logged progress for ${updates.length} goal(s)`);
  }
}

export async function getActiveGoals(userId: string): Promise<any[]> {
  const dbUserId = await resolveUserId(userId);

  const { data, error } = await supabaseAdmin
    .from('agi_goals')
    .select('*')
    .eq('user_id', dbUserId)
    .eq('status', 'active')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('[AGI][Goals] Failed to fetch active goals', error);
    return [];
  }

  return data || [];
}

export async function getGoalProgress(userId: string, goalId?: string): Promise<any[]> {
  const dbUserId = await resolveUserId(userId);

  let query = supabaseAdmin
    .from('agi_goal_progress')
    .select('*')
    .eq('user_id', dbUserId)
    .order('snapshot_date', { ascending: false })
    .limit(100);

  if (goalId) {
    query = query.eq('goal_id', goalId);
  }

  const { data, error } = await query;

  if (error) {
    console.error('[AGI][Goals] Failed to fetch goal progress', error);
    return [];
  }

  return data || [];
}


