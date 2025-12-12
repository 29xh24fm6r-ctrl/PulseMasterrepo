// Timeline Commitments Persistence
// lib/timeline_coach/commitments.ts

import { supabaseAdmin } from '@/lib/supabase';
import { TimelineDecisionBlueprint } from './types';

async function resolveUserId(clerkId: string): Promise<string> {
  const { data: userRow } = await supabaseAdmin
    .from("users")
    .select("id")
    .eq("clerk_id", clerkId)
    .maybeSingle();

  return userRow?.id || clerkId;
}

export async function saveTimelineDecisionForUser(userId: string, blueprint: TimelineDecisionBlueprint) {
  const dbUserId = await resolveUserId(userId);

  // Clear previous current flag
  await supabaseAdmin
    .from('timeline_decisions')
    .update({ is_current: false })
    .eq('user_id', dbUserId)
    .eq('is_current', true);

  const { data: decisionRows, error: decisionError } = await supabaseAdmin
    .from('timeline_decisions')
    .insert({
      user_id: dbUserId,
      run_id: blueprint.runId,
      chosen_timeline_id: blueprint.chosenTimelineId,
      horizon_days: blueprint.horizonDays,
      label: blueprint.label,
      rationale: blueprint.rationale,
      perceived_benefits: blueprint.perceivedBenefits ?? {},
      perceived_costs: blueprint.perceivedCosts ?? {},
      confidence: blueprint.confidence ?? 0.5,
      season_start: blueprint.seasonStart,
      season_end: blueprint.seasonEnd,
      is_current: true,
    })
    .select('id');

  if (decisionError) {
    console.error('[Timeline Coach] Failed to save decision', decisionError);
    throw decisionError;
  }

  const decisionId = decisionRows?.[0]?.id as string;

  if (blueprint.commitments?.length) {
    const rows = blueprint.commitments.map((c) => ({
      user_id: dbUserId,
      decision_id: decisionId,
      kind: c.kind,
      label: c.label,
      description: c.description ?? null,
      config: c.config ?? {},
      domain: c.domain ?? null,
    }));

    const { error: commitError } = await supabaseAdmin
      .from('timeline_commitments')
      .insert(rows);

    if (commitError) {
      console.error('[Timeline Coach] Failed to save commitments', commitError);
      throw commitError;
    }
  }

  return { decisionId };
}


