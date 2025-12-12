// Social Insights Generator
// lib/social/insights.ts

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

const SOCIAL_INSIGHTS_SYSTEM_PROMPT = `
You are analyzing the user's social graph.

You see:
- Nodes (self + contacts)
- Edges with metrics: strength, trust, tension, drift, influence, positivity.

Your job:
1. Identify ~3–10 "top relationships":
   - high combination of strength, importance, and influence.

2. Identify drift warnings:
   - relationships that matter but have high drift or long time since interaction.

3. Identify tension hotspots:
   - relationships with high tension and low positivity.

4. Identify reachout opportunities:
   - high-potential positive impact if the user reaches out soon.

Keep suggestions pro-social, honest, and non-manipulative.

Return JSON:
{
  "insights": {
    "summary": "...",
    "topRelationships": [...],
    "driftWarnings": [...],
    "tensionHotspots": [...],
    "reachoutOpportunities": [...]
  }
}

Only return valid JSON.`;

export async function refreshSocialInsightsForUser(userId: string) {
  const dbUserId = await resolveUserId(userId);

  const { data: nodes } = await supabaseAdmin
    .from('social_nodes')
    .select('*')
    .eq('user_id', dbUserId);

  const { data: edges } = await supabaseAdmin
    .from('social_edges')
    .select('*')
    .eq('user_id', dbUserId);

  if (!nodes || nodes.length === 0 || !edges || edges.length === 0) {
    console.warn('[Social] No nodes or edges found, skipping insights');
    return;
  }

  const result = await callAIJson<{
    insights: {
      summary: string;
      topRelationships: any[];
      driftWarnings: any[];
      tensionHotspots: any[];
      reachoutOpportunities: any[];
    };
  }>({
    userId,
    feature: 'social_insights',
    systemPrompt: SOCIAL_INSIGHTS_SYSTEM_PROMPT,
    userPrompt: JSON.stringify({
      nodes: nodes.map((n: any) => ({
        id: n.node_id,
        label: n.label,
        roles: n.roles,
        importanceScore: n.importance_score,
        lastInteractionAt: n.last_interaction_at,
      })),
      edges: edges.map((e: any) => ({
        from: e.from_node_id,
        to: e.to_node_id,
        relationshipType: e.relationship_type,
        strength: e.strength,
        trust: e.trust,
        tension: e.tension,
        drift: e.drift,
        influence: e.influence,
        positivity: e.positivity,
      })),
    }, null, 2),
    maxTokens: 2000,
    temperature: 0.7,
  });

  if (!result.success || !result.data) {
    console.error('[Social] Failed to generate insights', result.error);
    return;
  }

  const { insights } = result.data;

  const { error } = await supabaseAdmin
    .from('social_insights')
    .insert({
      user_id: dbUserId,
      summary: insights.summary,
      top_relationships: insights.topRelationships || [],
      drift_warnings: insights.driftWarnings || [],
      tension_hotspots: insights.tensionHotspots || [],
      reachout_opportunities: insights.reachoutOpportunities || [],
    });

  if (error) {
    console.error('[Social] Failed to insert insights', error);
    throw error;
  }
}


