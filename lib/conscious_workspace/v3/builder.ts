// Conscious Frame Builder
// lib/conscious_workspace/v3/builder.ts

import { supabaseAdmin } from '@/lib/supabase';
import { callAIJson } from '@/lib/ai/call';
import { ConsciousFrameContext, ConsciousItemBlueprint } from './types';

async function resolveUserId(clerkId: string): Promise<string> {
  const { data: userRow } = await supabaseAdmin
    .from("users")
    .select("id")
    .eq("clerk_id", clerkId)
    .maybeSingle();

  return userRow?.id || clerkId;
}

const CONSCIOUS_FRAME_BUILDER_PROMPT = `
You are the Global Workspace coordinator.

You see:
- Trigger info (what caused this frame).
- Timeline, destiny, narrative contexts.
- Self Mirror snapshot (who the user is being lately).
- Emotion & somatic states (how they feel & energy).
- Social state & risks.

Your job:
1. Decide what this frame is "about":
   - frameSummary.summary: 1–3 sentences.
   - dominantContext: domain + situation (e.g., { domain: "work", situation: "big deal + relationship tension" }).
   - overallUrgency, overallComplexity, overallLoad (0..1).

2. Produce a set of conscious items:
   - tasks, risks, insights, tradeoffs, questions, plan nodes.
   - Each item includes:
     - sourceSubsystem, kind, title, description, payload, domain, tags.
     - urgency, importance, emotionalSalience (0..1).

Focus on what *truly* deserves attention in this moment. Ignore noise.

Return JSON: {
  "frameSummary": { ... },
  "items": [ ... ]
}

Only return valid JSON.`;

async function getTimelineChoiceContextForUser(userId: string): Promise<any> {
  const dbUserId = await resolveUserId(userId);

  const { data: decisions } = await supabaseAdmin
    .from('timeline_decisions')
    .select('*')
    .eq('user_id', dbUserId)
    .eq('is_current', true)
    .limit(1);

  return decisions?.[0] ?? null;
}

async function getCurrentDestinyContextForUser(userId: string): Promise<any> {
  const dbUserId = await resolveUserId(userId);

  const { data: arcs } = await supabaseAdmin
    .from('destiny_arcs')
    .select('*')
    .eq('user_id', dbUserId)
    .eq('is_current', true)
    .limit(1);

  const { data: blueprints } = await supabaseAdmin
    .from('destiny_blueprints')
    .select('*')
    .eq('user_id', dbUserId)
    .eq('is_primary', true)
    .limit(1);

  return {
    arc: arcs?.[0] ?? null,
    blueprint: blueprints?.[0] ?? null,
  };
}

async function getLatestNarrativeSnapshotForUser(userId: string): Promise<any> {
  const dbUserId = await resolveUserId(userId);

  const { data } = await supabaseAdmin
    .from('narrative_snapshots')
    .select('*')
    .eq('user_id', dbUserId)
    .order('snapshot_at', { ascending: false })
    .limit(1);

  return data?.[0] ?? null;
}

async function getLatestEmotionStateForUser(userId: string): Promise<any> {
  const dbUserId = await resolveUserId(userId);

  const { data } = await supabaseAdmin
    .from('emotion_state_daily')
    .select('*')
    .eq('user_id', dbUserId)
    .order('state_date', { ascending: false })
    .limit(1);

  return data?.[0] ?? null;
}

async function getLatestSelfMirrorSnapshotForUser(userId: string): Promise<any> {
  const dbUserId = await resolveUserId(userId);

  const { data } = await supabaseAdmin
    .from('self_mirror_snapshots')
    .select('*')
    .eq('user_id', dbUserId)
    .order('snapshot_date', { ascending: false })
    .limit(1);

  return data?.[0] ?? null;
}

function computeAttentionScore(item: ConsciousItemBlueprint): number {
  // Simple weighted combination
  const u = item.urgency ?? 0;
  const i = item.importance ?? 0;
  const e = item.emotionalSalience ?? 0;
  return Math.max(0, Math.min(1, 0.4 * u + 0.4 * i + 0.2 * e));
}

export async function buildConsciousFrameForUser(
  userId: string,
  trigger: { kind: string; source: string; reference?: any },
  now: Date
) {
  const day = now.toISOString().slice(0, 10);
  const dbUserId = await resolveUserId(userId);

  const [
    timelineCtx,
    destinyCtx,
    narrativeCtx,
    emotionState,
    somaticState,
    selfMirrorSnapshot,
    socialSnapshotRes,
    socialRisksRes,
  ] = await Promise.all([
    getTimelineChoiceContextForUser(userId).catch(() => null),
    getCurrentDestinyContextForUser(userId).catch(() => null),
    getLatestNarrativeSnapshotForUser(userId).catch(() => null),
    getLatestEmotionStateForUser(userId).catch(() => null),
    (async () => {
      const { getSomaticSnapshotForUser } = await import('@/lib/somatic/v2/context');
      return await getSomaticSnapshotForUser(userId, now).catch(() => null);
    })(),
    getLatestSelfMirrorSnapshotForUser(userId).catch(() => null),
    supabaseAdmin
      .from('social_state_snapshots')
      .select('*')
      .eq('user_id', dbUserId)
      .eq('snapshot_date', day)
      .limit(1),
    supabaseAdmin
      .from('social_risk_events')
      .select('*')
      .eq('user_id', dbUserId)
      .is('resolved_at', null)
      .gte('created_at', new Date(Date.now() - 3 * 86400000).toISOString()),
  ]);

  const socialState = socialSnapshotRes.data?.[0] ?? null;

  const ctx: ConsciousFrameContext = {
    triggerKind: trigger.kind,
    triggerSource: trigger.source,
    triggerReference: trigger.reference ?? null,
    timelineContext: timelineCtx ? {
      label: timelineCtx.label,
      rationale: timelineCtx.rationale,
      seasonStart: timelineCtx.season_start,
      seasonEnd: timelineCtx.season_end,
    } : null,
    destinyContext: destinyCtx ? {
      arc: destinyCtx.arc ? {
        name: destinyCtx.arc.name,
        logline: destinyCtx.arc.logline,
        focusDomains: destinyCtx.arc.focus_domains,
      } : null,
      blueprint: destinyCtx.blueprint ? {
        name: destinyCtx.blueprint.name,
        tagline: destinyCtx.blueprint.tagline,
      } : null,
    } : null,
    narrativeContext: narrativeCtx ? {
      shortLogline: narrativeCtx.short_logline,
      tensions: narrativeCtx.tensions || [],
      opportunities: narrativeCtx.opportunities || [],
    } : null,
    selfMirrorSnapshot: selfMirrorSnapshot ? {
      overallAlignment: selfMirrorSnapshot.overall_alignment,
      driftScore: selfMirrorSnapshot.drift_score,
      selfCompassionScore: selfMirrorSnapshot.self_compassion_score,
      narrativeSummary: selfMirrorSnapshot.narrative_summary,
    } : null,
    emotionState: emotionState ? {
      stressScore: emotionState.stress_score,
      resilienceScore: emotionState.resilience_score,
    } : null,
    somaticState: somaticState ? {
      energyScore: somaticState.energy_score,
      fatigueScore: somaticState.fatigue_score,
      recoveryScore: somaticState.recovery_score,
    } : null,
    socialState: socialState ? {
      overallHealth: socialState.overall_health,
      overallTension: socialState.overall_tension,
      overallDrift: socialState.overall_drift,
      narrativeSummary: socialState.narrative_summary,
    } : null,
    risks: (socialRisksRes.data || []).slice(0, 10).map((r: any) => ({
      riskKind: r.risk_kind,
      severity: r.severity,
      summary: r.summary,
      entityId: r.entity_id,
    })),
    opportunities: [],
    activeWorkspaceThreads: [],
  };

  const result = await callAIJson<{
    frameSummary: {
      summary: string;
      dominantContext: any;
      overallUrgency: number;
      overallComplexity: number;
      overallLoad: number;
    };
    items: ConsciousItemBlueprint[];
  }>({
    userId,
    feature: 'conscious_frame',
    systemPrompt: CONSCIOUS_FRAME_BUILDER_PROMPT,
    userPrompt: JSON.stringify(ctx, null, 2),
    maxTokens: 4000,
    temperature: 0.7,
  });

  if (!result.success || !result.data) {
    console.error('[Conscious Workspace] Failed to generate frame', result.error);
    return { frameId: null, items: [] };
  }

  const { frameSummary, items } = result.data;

  // Insert frame
  const { data: frameRows, error: frameError } = await supabaseAdmin
    .from('conscious_frames')
    .insert({
      user_id: dbUserId,
      frame_time: now.toISOString(),
      trigger_kind: trigger.kind,
      trigger_source: trigger.source,
      trigger_reference: trigger.reference ?? {},
      summary: frameSummary.summary,
      dominant_context: frameSummary.dominantContext ?? {},
      overall_urgency: frameSummary.overallUrgency ?? 0.5,
      overall_complexity: frameSummary.overallComplexity ?? 0.5,
      overall_load: frameSummary.overallLoad ?? 0.5,
    })
    .select('id');

  if (frameError) {
    console.error('[Conscious Workspace] Failed to insert frame', frameError);
    throw frameError;
  }

  const frameId = frameRows?.[0]?.id as string;

  // Insert items
  if (items?.length) {
    const rows = items.map((i) => ({
      user_id: dbUserId,
      frame_id: frameId,
      source_subsystem: i.sourceSubsystem,
      kind: i.kind,
      title: i.title,
      description: i.description ?? null,
      payload: i.payload ?? {},
      domain: i.domain ?? null,
      tags: i.tags ?? [],
      urgency: i.urgency,
      importance: i.importance,
      emotional_salience: i.emotionalSalience,
      attention_score: computeAttentionScore(i),
    }));

    const { data: itemRows, error: itemError } = await supabaseAdmin
      .from('conscious_items')
      .insert(rows)
      .select('id, attention_score');

    if (itemError) {
      console.error('[Conscious Workspace] Failed to insert items', itemError);
      throw itemError;
    }
    return { frameId, items: itemRows || [] };
  }

  return { frameId, items: [] };
}


