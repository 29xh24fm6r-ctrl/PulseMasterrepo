// Social State Snapshot Generator
// lib/social/v2/snapshot.ts

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

const SOCIAL_STATE_SNAPSHOT_PROMPT = `
You are the Social Graph Intelligence Engine.

You see:
- All people in the user's world (social_entities).
- Edges showing relationship metrics (closeness, tension, drift, trust).
- Theory of Mind profiles for some of them.

Your job:
1. Summarize the overall relationship health:
   - overallHealth, overallTension, overallDrift, overallSupport (0..1).

2. Identify 2–10 keyIssues:
   - each with entityId, label, severity, and notes.
   - examples: "unspoken conflict with spouse", "client drift risk", "friendship starving for contact".

3. Identify 2–10 keyOpportunities:
   - high-leverage chances to deepen bonds, repair, or collaborate.

4. Write a short narrativeSummary of this season in their relationships.

Return JSON: { "snapshot": { ... } }.

Only return valid JSON.`;

export async function refreshSocialStateSnapshotForUser(userId: string, date: Date) {
  const day = date.toISOString().slice(0, 10);
  const dbUserId = await resolveUserId(userId);

  const [{ data: entities }, { data: edges }, { data: tomProfiles }] = await Promise.all([
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
  ]);

  const result = await callAIJson<{
    snapshot: {
      overallHealth: number;
      overallTension: number;
      overallDrift: number;
      overallSupport: number;
      keyIssues: any[];
      keyOpportunities: any[];
      narrativeSummary: string;
    };
  }>({
    userId,
    feature: 'social_snapshot',
    systemPrompt: SOCIAL_STATE_SNAPSHOT_PROMPT,
    userPrompt: JSON.stringify({
      date: day,
      entities: (entities || []).map((e: any) => ({
        id: e.id,
        displayName: e.display_name,
        roleLabel: e.role_label,
        importance: e.importance,
        tags: e.tags || [],
        lastInteractionAt: e.last_interaction_at,
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
        metrics: e.metrics || {},
      })),
      tomProfiles: (tomProfiles || []).map((p: any) => ({
        entityId: p.entity_id,
        summary: p.summary,
        currentStateHypothesis: p.current_state_hypothesis || {},
      })),
    }, null, 2),
    maxTokens: 3000,
    temperature: 0.7,
  });

  if (!result.success || !result.data) {
    console.error('[Social] Failed to generate snapshot', result.error);
    return;
  }

  const { snapshot } = result.data;

  const { error } = await supabaseAdmin
    .from('social_state_snapshots')
    .upsert(
      {
        user_id: dbUserId,
        snapshot_date: day,
        overall_health: snapshot.overallHealth,
        overall_tension: snapshot.overallTension,
        overall_drift: snapshot.overallDrift,
        overall_support: snapshot.overallSupport,
        key_issues: snapshot.keyIssues ?? [],
        key_opportunities: snapshot.keyOpportunities ?? [],
        narrative_summary: snapshot.narrativeSummary ?? null,
      },
      { onConflict: 'user_id,snapshot_date' }
    );

  if (error) {
    console.error('[Social] Failed to upsert snapshot', error);
    throw error;
  }
}


