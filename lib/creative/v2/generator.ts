// Creative Idea Generator
// lib/creative/v2/generator.ts

import { supabaseAdmin } from '@/lib/supabase';
import { callAIJson } from '@/lib/ai/call';
import { CreativeIdeaBlueprint } from './types';

async function resolveUserId(clerkId: string): Promise<string> {
  const { data: userRow } = await supabaseAdmin
    .from("users")
    .select("id")
    .eq("clerk_id", clerkId)
    .maybeSingle();

  return userRow?.id || clerkId;
}

const CREATIVE_IDEA_PROMPT = `
You are the Creative Cortex v2 for a life OS.

You see:
- The topic and goal for this creative session.
- The user's Destiny & current Destiny Arc.
- Timeline Coach context (near-term preferred future).
- Culture contexts (org/industry/family norms).
- Current emotion + somatic state (how much energy they realistically have).

Your job:
1. Generate 5–20 high-quality, diverse ideas relevant to the session goal.
2. For each idea:
   - Be concrete and implementable.
   - Consider culture fit (no suggestions that would obviously clash with their bank or context).
   - Consider destiny & values alignment.
   - Consider their current energy (don't propose 20-hour days if they're burnt out).

3. For each idea, provide:
   - title
   - description (what + why)
   - category (feature, script, deal_strategy, habit_experiment, etc.)
   - tags
   - rawPayload (optional extra structure, steps, variations)
   - scores:
     - scoreOverall (0..1)
     - scoreAlignment (0..1)
     - scoreImpact (0..1)
     - scoreFeasibility (0..1)
     - scoreEnergyFit (0..1)

Return JSON: { "ideas": [ ... ] }.

Only return valid JSON.`;

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

export async function generateCreativeIdeasForSession(
  userId: string,
  sessionId: string
) {
  const dbUserId = await resolveUserId(userId);

  const { data: sessionRows, error: sessionError } = await supabaseAdmin
    .from('creative_sessions')
    .select('*')
    .eq('user_id', dbUserId)
    .eq('id', sessionId)
    .limit(1);

  if (sessionError) {
    console.error('[Creative Cortex] Failed to fetch session', sessionError);
    throw sessionError;
  }

  const session = sessionRows?.[0];
  if (!session) {
    console.warn('[Creative Cortex] Session not found', sessionId);
    return;
  }

  const { getCultureContextSnapshot } = await import('@/lib/culture/context_provider');
  const { getSomaticSnapshotForUser } = await import('@/lib/somatic/v2/context');

  const [destiny, timelineCtx, culture, emotion, somatic] = await Promise.all([
    getCurrentDestinyContextForUser(userId).catch(() => null),
    getTimelineChoiceContextForUser(userId).catch(() => null),
    getCultureContextSnapshot(userId, ['primary_org', 'industry_commercial_banking', 'family_core']).catch(() => []),
    getLatestEmotionStateForUser(userId).catch(() => null),
    getSomaticSnapshotForUser(userId, new Date()).catch(() => null),
  ]);

  const result = await callAIJson<{ ideas: CreativeIdeaBlueprint[] }>({
    userId,
    feature: 'creative_ideas',
    systemPrompt: CREATIVE_IDEA_PROMPT,
    userPrompt: JSON.stringify({
      topic: session.topic,
      goal: session.goal,
      domain: session.domain,
      mode: session.mode,
      destiny: destiny ? {
        arc: destiny.arc ? {
          name: destiny.arc.name,
          logline: destiny.arc.logline,
          focusDomains: destiny.arc.focus_domains,
        } : null,
        blueprint: destiny.blueprint ? {
          name: destiny.blueprint.name,
          tagline: destiny.blueprint.tagline,
        } : null,
      } : null,
      timeline: timelineCtx ? {
        label: timelineCtx.label,
        rationale: timelineCtx.rationale,
        seasonStart: timelineCtx.season_start,
        seasonEnd: timelineCtx.season_end,
      } : null,
      cultureContexts: culture.map((c: any) => ({
        name: c.context.name,
        kind: c.context.kind,
        profile: c.profile ? {
          norms: c.profile.norms,
          communicationStyle: c.profile.communication_style,
          tabooBehaviors: c.profile.taboo_behaviors,
        } : null,
      })),
      emotion: emotion ? {
        stressScore: emotion.stress_score,
        resilienceScore: emotion.resilience_score,
      } : null,
      somatic: somatic ? {
        energyScore: somatic.energy_score,
        fatigueScore: somatic.fatigue_score,
        recoveryScore: somatic.recovery_score,
      } : null,
    }, null, 2),
    maxTokens: 4000,
    temperature: 0.8, // Higher for more creative/divergent ideas
  });

  if (!result.success || !result.data || !result.data.ideas?.length) {
    console.error('[Creative Cortex] Failed to generate ideas', result.error);
    return;
  }

  const { ideas } = result.data;

  const rows = ideas.map((i) => ({
    user_id: dbUserId,
    session_id: sessionId,
    title: i.title,
    description: i.description,
    category: i.category ?? null,
    tags: i.tags ?? [],
    raw_payload: i.rawPayload ?? {},
    score_overall: i.scoreOverall,
    score_alignment: i.scoreAlignment ?? null,
    score_impact: i.scoreImpact ?? null,
    score_feasibility: i.scoreFeasibility ?? null,
    score_energy_fit: i.scoreEnergyFit ?? null,
  }));

  const { data: inserted, error } = await supabaseAdmin
    .from('creative_ideas')
    .insert(rows)
    .select('id');

  if (error) {
    console.error('[Creative Cortex] Failed to insert ideas', error);
    throw error;
  }
  return inserted?.map((r: any) => r.id as string);
}


