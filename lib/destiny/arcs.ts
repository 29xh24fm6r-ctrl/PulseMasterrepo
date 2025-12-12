// Destiny Arc Creation & Checkpoints
// lib/destiny/arcs.ts

import { supabaseAdmin } from '@/lib/supabase';
import { callAIJson } from '@/lib/ai/call';
import { DestinyArcBlueprint } from './types';

async function resolveUserId(clerkId: string): Promise<string> {
  const { data: userRow } = await supabaseAdmin
    .from("users")
    .select("id")
    .eq("clerk_id", clerkId)
    .maybeSingle();

  return userRow?.id || clerkId;
}

const DESTINY_ARC_PROMPT = `
You are the Destiny Arc Planner.

You see:
- A primary Destiny Blueprint (3–10 years).
- Today's date.
- Optionally an existing arc (which may be outdated).

Your job:
1. Define a single Destiny Arc for the next 6–24 months:
   - Choose a timeframe that is realistic: long enough to matter, short enough to steer.
2. Provide:
   - name: memorable.
   - logline: 1–2 sentence story of this arc.
   - arcStart and arcEnd (YYYY-MM-DD).
   - focusDomains: which life domains are foregrounded this arc.
   - guidingPrinciples: 3–7 key principles (e.g. "Protect the marriage", "Push the craft", "Guard the body").

Return JSON: { "arc": { ... } }.

Only return valid JSON.`;

const DESTINY_CHECKPOINTS_PROMPT = `
You are the Destiny Checkpoint Builder.

You see:
- A 6–24 month Destiny Arc.
- The long-term Blueprint it serves.

Your job:
1. Propose 3–12 key checkpoints that, if reached, would mean this arc is a success.
2. For each checkpoint:
   - label, description,
   - domain (work, relationships, health, finance, self, etc.),
   - targetDate within the arc,
   - metrics (optional KPIs or qualitative markers),
   - importance (0–1).

Return JSON: { "checkpoints": [ ... ] }.

Only return valid JSON.`;

export async function refreshCurrentDestinyArcForUser(userId: string) {
  const dbUserId = await resolveUserId(userId);

  const { data: blueprints } = await supabaseAdmin
    .from('destiny_blueprints')
    .select('*')
    .eq('user_id', dbUserId)
    .eq('is_primary', true)
    .limit(1);

  const blueprint = blueprints?.[0];
  if (!blueprint) {
    console.warn('[Destiny] No primary blueprint found');
    return;
  }

  const today = new Date();
  const todayStr = today.toISOString().slice(0, 10);

  const { data: existingArcs } = await supabaseAdmin
    .from('destiny_arcs')
    .select('*')
    .eq('user_id', dbUserId)
    .eq('is_current', true)
    .limit(1);

  const currentArc = existingArcs?.[0] ?? null;

  const result = await callAIJson<{ arc: DestinyArcBlueprint }>({
    userId,
    feature: 'destiny_arc',
    systemPrompt: DESTINY_ARC_PROMPT,
    userPrompt: JSON.stringify({
      blueprint: {
        key: blueprint.key,
        name: blueprint.name,
        tagline: blueprint.tagline,
        horizonYears: blueprint.horizon_years,
        description: blueprint.description,
        identityThemes: blueprint.identity_themes,
        domainTargets: blueprint.domain_targets,
        nonNegotiables: blueprint.non_negotiables,
        tradeoffPhilosophy: blueprint.tradeoff_philosophy,
      },
      today: todayStr,
      existingArc: currentArc ? {
        name: currentArc.name,
        logline: currentArc.logline,
        arcStart: currentArc.arc_start,
        arcEnd: currentArc.arc_end,
        status: currentArc.status,
      } : null,
    }, null, 2),
    maxTokens: 2000,
    temperature: 0.7,
  });

  if (!result.success || !result.data) {
    console.error('[Destiny] Failed to generate arc', result.error);
    return;
  }

  const { arc } = result.data;

  // Clear previous current arc flag
  await supabaseAdmin
    .from('destiny_arcs')
    .update({ is_current: false })
    .eq('user_id', dbUserId)
    .eq('is_current', true);

  const { data: arcRows, error: arcError } = await supabaseAdmin
    .from('destiny_arcs')
    .upsert(
      {
        user_id: dbUserId,
        blueprint_id: blueprint.id,
        name: arc.name,
        logline: arc.logline,
        arc_start: arc.arcStart,
        arc_end: arc.arcEnd,
        focus_domains: arc.focusDomains ?? {},
        guiding_principles: arc.guidingPrinciples ?? {},
        status: 'active',
        is_current: true,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id,blueprint_id' }
    )
    .select('id');

  if (arcError) {
    console.error('[Destiny] Failed to upsert arc', arcError);
    throw arcError;
  }

  const arcId = arcRows?.[0]?.id as string;

  // Create checkpoints
  await createDestinyCheckpointsForArc(userId, arcId, blueprint, arc);
}

export async function createDestinyCheckpointsForArc(
  userId: string,
  arcId: string,
  blueprint: any,
  arc: DestinyArcBlueprint
) {
  const dbUserId = await resolveUserId(userId);

  // Clear existing checkpoints for this arc
  await supabaseAdmin
    .from('destiny_checkpoints')
    .delete()
    .eq('user_id', dbUserId)
    .eq('arc_id', arcId);

  const result = await callAIJson<{
    checkpoints: Array<{
      label: string;
      description?: string;
      domain?: string;
      targetDate?: string;
      metrics?: any;
      importance?: number;
    }>;
  }>({
    userId,
    feature: 'destiny_checkpoints',
    systemPrompt: DESTINY_CHECKPOINTS_PROMPT,
    userPrompt: JSON.stringify({
      blueprint: {
        name: blueprint.name,
        tagline: blueprint.tagline,
        domainTargets: blueprint.domain_targets,
      },
      arc: {
        name: arc.name,
        logline: arc.logline,
        arcStart: arc.arcStart,
        arcEnd: arc.arcEnd,
        focusDomains: arc.focusDomains,
        guidingPrinciples: arc.guidingPrinciples,
      },
    }, null, 2),
    maxTokens: 2000,
    temperature: 0.7,
  });

  if (!result.success || !result.data || !result.data.checkpoints?.length) {
    console.warn('[Destiny] No checkpoints generated');
    return;
  }

  const { checkpoints } = result.data;

  const rows = checkpoints.map((c) => ({
    user_id: dbUserId,
    arc_id: arcId,
    label: c.label,
    description: c.description ?? null,
    domain: c.domain ?? null,
    target_date: c.targetDate ?? null,
    metrics: c.metrics ?? {},
    importance: c.importance ?? 0.7,
    updated_at: new Date().toISOString(),
  }));

  const { error } = await supabaseAdmin
    .from('destiny_checkpoints')
    .insert(rows);

  if (error) {
    console.error('[Destiny] Failed to insert checkpoints', error);
    throw error;
  }
}


