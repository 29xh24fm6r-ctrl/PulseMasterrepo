// Destiny Engine v2 - Timeline Scoring
// lib/destiny/scoring.ts

import { supabaseAdminClient } from '../../supabase/admin';
import { callAI } from '@/lib/ai/call';
import { DestinyTimelineScore } from './types';

export async function refreshTimelineScores(userId: string): Promise<DestinyTimelineScore[]> {
  // Get all active timelines
  const { data: timelines } = await supabaseAdminClient
    .from('destiny_timelines')
    .select('*')
    .eq('user_id', userId)
    .eq('is_active', true);

  if (!timelines || timelines.length === 0) {
    return [];
  }

  // Get Self Mirror snapshot
  const { data: latestSnapshot } = await supabaseAdminClient
    .from('self_identity_snapshots')
    .select('*')
    .eq('user_id', userId)
    .order('taken_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  // Get Self Mirror facets
  const { data: facets } = await supabaseAdminClient
    .from('self_mirror_facets')
    .select('*')
    .eq('user_id', userId);

  // Get Civilization domain states
  const { data: domainStates } = await supabaseAdminClient
    .from('civilization_domain_state')
    .select('*, civilization_domains(*)')
    .eq('civilization_domains.user_id', userId)
    .order('snapshot_date', { ascending: false })
    .limit(10);

  const scores: DestinyTimelineScore[] = [];

  for (const timeline of timelines) {
    // 1. Build parameters
    const parameters = {
      time_horizon_years: timeline.time_horizon_years,
      primary_domains: timeline.primary_domains,
      archetype: timeline.archetype,
      mythic_frame: timeline.mythic_frame,
    };

    // 2. Get waypoints for context
    const { data: waypoints } = await supabaseAdminClient
      .from('destiny_waypoints')
      .select('*')
      .eq('timeline_id', timeline.id)
      .order('ordering', { ascending: true });

    // 3. Placeholder for Life Simulation call
    // In a full implementation, this would call the Life Simulation Engine
    const simulationSummary: any = {
      financial_trajectory: 'stable',
      stress_risk: 'moderate',
      relationship_impact: 'neutral',
      creative_expression: 'moderate',
    };

    // 4. Use LLM to compute scores and generate narrative
    const scoringPrompt = `Timeline: ${timeline.name}
Description: ${timeline.description ?? 'N/A'}
Time Horizon: ${timeline.time_horizon_years} years
Primary Domains: ${timeline.primary_domains.join(', ')}
Archetype: ${timeline.archetype ?? 'N/A'}
Mythic Frame: ${timeline.mythic_frame ?? 'N/A'}

Waypoints:
${waypoints?.map((w) => `- ${w.name} (target: ${w.target_date ?? 'TBD'})`).join('\n') ?? 'None'}

Self Mirror Context:
- Roles: ${JSON.stringify(latestSnapshot?.roles ?? [])}
- Values: ${JSON.stringify(latestSnapshot?.values ?? [])}
- Overall Alignment: ${latestSnapshot?.overall_self_alignment ?? 'N/A'}/10

Facets:
${facets?.map((f) => `- ${f.name}: ${f.score ?? 'N/A'}/100 (trend: ${f.trend})`).join('\n') ?? 'None'}

Civilization Domains:
${domainStates?.map((s: any) => `- ${s.civilization_domains?.name}: activity ${s.activity_score}/100, health ${s.health_score}/100`).join('\n') ?? 'None'}

Simulation Summary:
${JSON.stringify(simulationSummary, null, 2)}

Evaluate this timeline and provide:
1. Feasibility score (0-10): How realistic/achievable is this path given current resources and trends?
2. Alignment score (0-10): How well does this path align with the user's stated values, roles, and identity?
3. Risk score (0-10): How risky is this path? (Higher = riskier)
4. Emotional fit score (0-10): How well does this path match the user's emotional patterns and preferences?
5. A brief narrative summary (2-3 sentences) describing what this timeline would look like in practice.`;

    const result = await callAI({
      userId,
      feature: 'destiny_scoring',
      systemPrompt: 'You are a timeline evaluator. Analyze future paths and provide scores and insights.',
      userPrompt: scoringPrompt,
      maxTokens: 800,
      temperature: 0.7,
    });

    if (!result.success || !result.content) {
      console.error(`Failed to score timeline ${timeline.id}`);
      continue;
    }

    // Parse scores from response (simple extraction - could be improved)
    const content = result.content;
    const feasibilityMatch = content.match(/feasibility[:\s]+(\d+(?:\.\d+)?)/i);
    const alignmentMatch = content.match(/alignment[:\s]+(\d+(?:\.\d+)?)/i);
    const riskMatch = content.match(/risk[:\s]+(\d+(?:\.\d+)?)/i);
    const emotionalMatch = content.match(/emotional[:\s]+fit[:\s]+(\d+(?:\.\d+)?)/i);

    const feasibilityScore = feasibilityMatch ? parseFloat(feasibilityMatch[1]) : null;
    const alignmentScore = alignmentMatch ? parseFloat(alignmentMatch[1]) : null;
    const riskScore = riskMatch ? parseFloat(riskMatch[1]) : null;
    const emotionalFitScore = emotionalMatch ? parseFloat(emotionalMatch[1]) : null;

    // Extract narrative summary (everything after "narrative summary" or similar)
    const narrativeMatch = content.match(/(?:narrative|summary)[:\s]+(.+?)(?:\n\n|$)/is);
    const narrativeSummary = narrativeMatch ? narrativeMatch[1].trim() : content.substring(0, 300);

    // 5. Save score
    const { data: score, error } = await supabaseAdminClient
      .from('destiny_timeline_scores')
      .insert({
        timeline_id: timeline.id,
        snapshot_at: new Date().toISOString(),
        feasibility_score: feasibilityScore !== null ? Math.round(feasibilityScore * 100) / 100 : null,
        alignment_score: alignmentScore !== null ? Math.round(alignmentScore * 100) / 100 : null,
        risk_score: riskScore !== null ? Math.round(riskScore * 100) / 100 : null,
        emotional_fit_score: emotionalFitScore !== null ? Math.round(emotionalFitScore * 100) / 100 : null,
        simulation_summary: simulationSummary,
        narrative_summary: narrativeSummary,
      })
      .select('*')
      .single();

    if (error) {
      console.error(`Failed to save score for timeline ${timeline.id}`, error);
      continue;
    }

    if (score) {
      scores.push(score);
    }
  }

  return scores;
}


