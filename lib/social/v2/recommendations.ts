// Social Risks and Recommendations Generator
// lib/social/v2/recommendations.ts

import { supabaseAdmin } from '@/lib/supabase';
import { callAIJson } from '@/lib/ai/call';

async function resolveUserId(clerkId: string): Promise<string> {
  const { data: userRow } = await supabaseAdmin
    .from("users")
    .select("id")
    .eq("clerk_id", clerkId)
    .maybeSingle();

  return userRow?.id || clerkId;
}

const SOCIAL_RISKS_AND_RECS_PROMPT = `
You are the Relationship Guardian.

You see:
- The user's social entities and edges.
- Theory of Mind profiles.

Your job:
1. Identify social_risk_events that matter:
   - riskKind: 'looming_conflict', 'resentment_building', 'drift_risk', 'burnout_on_their_side', etc.
   - severity (0..1), timeframe, summary, context (high-level only).

2. Generate 3–15 social_recommendations:
   - entityId (if specific person) or null if general.
   - kind: 'checkin', 'repair', 'celebrate', 'support', 'boundary'.
   - label: short.
   - suggestion: exactly what Pulse might recommend the user do/say.
   - priority (0..1).
   - recommendedForDate: usually today or this week.

Be kind, non-judgmental, and realistic. Do not try to diagnose mental health; just focus on patterns and caring actions.

Return JSON: { "result": { "risks": [...], "recommendations": [...] } }.

Only return valid JSON.`;

export async function refreshSocialRisksAndRecommendationsForUser(userId: string, date: Date) {
  const day = date.toISOString().slice(0, 10);
  const dbUserId = await resolveUserId(userId);

  const [{ data: entities }, { data: edges }, { data: tomProfiles }, { data: existingRisks }] = await Promise.all([
    supabaseAdmin
      .from('social_entities')
      .select('*')
      .eq('user_id', dbUserId)
      .order('importance', { ascending: false, nullsLast: true }),
    supabaseAdmin
      .from('social_edges')
      .select('*')
      .eq('user_id', dbUserId),
    supabaseAdmin
      .from('theory_of_mind_profiles')
      .select('*')
      .eq('user_id', dbUserId),
    supabaseAdmin
      .from('social_risk_events')
      .select('*')
      .eq('user_id', dbUserId)
      .is('resolved_at', null)
      .order('created_at', { ascending: false })
      .limit(10),
  ]);

  const result = await callAIJson<{
    result: {
      risks: Array<{
        entityId?: string;
        riskKind: string;
        severity: number;
        timeframe: string;
        summary: string;
        context?: any;
      }>;
      recommendations: Array<{
        entityId?: string;
        kind: string;
        label: string;
        suggestion: string;
        priority: number;
        domain?: string;
        recommendedForDate?: string;
      }>;
    };
  }>({
    userId,
    feature: 'social_risks_recommendations',
    systemPrompt: SOCIAL_RISKS_AND_RECS_PROMPT,
    userPrompt: JSON.stringify({
      date: day,
      entities: (entities || []).map((e: any) => ({
        id: e.id,
        displayName: e.display_name,
        roleLabel: e.role_label,
        importance: e.importance,
        tags: e.tags || [],
      })),
      edges: (edges || []).map((e: any) => ({
        fromEntityId: e.from_entity_id,
        toEntityId: e.to_entity_id,
        relationshipType: e.relationship_type,
        closeness: e.closeness,
        trust: e.trust,
        tension: e.tension,
        drift: e.drift,
        supportiveness: e.supportiveness,
      })),
      tomProfiles: (tomProfiles || []).map((p: any) => ({
        entityId: p.entity_id,
        summary: p.summary,
        currentStateHypothesis: p.current_state_hypothesis || {},
        stressTriggers: p.stress_triggers || {},
        conflictPatterns: p.conflict_patterns || {},
      })),
      existingRisks: (existingRisks || []).map((r: any) => ({
        riskKind: r.risk_kind,
        severity: r.severity,
        summary: r.summary,
      })),
    }, null, 2),
    maxTokens: 3500,
    temperature: 0.7,
  });

  if (!result.success || !result.data) {
    console.error('[Social] Failed to generate risks and recommendations', result.error);
    return;
  }

  const { result: data } = result.data;

  // Insert new risks (only if not already existing)
  if (data.risks?.length) {
    const risksRows = data.risks.map((r) => ({
      user_id: dbUserId,
      entity_id: r.entityId ?? null,
      risk_kind: r.riskKind,
      severity: r.severity,
      timeframe: r.timeframe,
      summary: r.summary,
      context: r.context ?? {},
    }));

    const { error: risksError } = await supabaseAdmin
      .from('social_risk_events')
      .insert(risksRows);
    if (risksError) {
      console.error('[Social] Failed to insert risks', risksError);
      // Don't throw, continue with recommendations
    }
  }

  // Insert new recommendations
  if (data.recommendations?.length) {
    const recsRows = data.recommendations.map((rec) => ({
      user_id: dbUserId,
      entity_id: rec.entityId ?? null,
      kind: rec.kind,
      label: rec.label,
      suggestion: rec.suggestion,
      priority: rec.priority,
      domain: rec.domain ?? null,
      recommended_for_date: rec.recommendedForDate ?? day,
    }));

    const { error: recError } = await supabaseAdmin
      .from('social_recommendations')
      .insert(recsRows);
    if (recError) {
      console.error('[Social] Failed to insert recommendations', recError);
      throw recError;
    }
  }
}


