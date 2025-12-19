// Boardroom Brain v1 - Decision Orchestrator
// lib/boardroom/orchestrator.ts

import "server-only";
import { ensureDefaultCouncilSeeded, runCouncilVote } from './council';
import { generateDecisionScenarios } from './decision_theater';
import { callAIJson } from '@/lib/ai/call';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { ExecutiveCouncilVote, DecisionScenario } from './types';

async function resolveUserId(clerkId: string): Promise<string> {
  const { data: userRow } = await supabaseAdmin
    .from("users")
    .select("id")
    .eq("clerk_id", clerkId)
    .maybeSingle();

  return userRow?.id || clerkId;
}

export async function runBoardroomReview(params: {
  userId: string;
  decisionId: string;
}): Promise<{
  council: {
    votes: ExecutiveCouncilVote[];
    aggregateSummary: string;
  };
  scenarios: DecisionScenario[];
  recommendedOptionId?: string;
  recommendedSummary: string;
}> {
  const dbUserId = await resolveUserId(params.userId);

  // Ensure default council seeded
  await ensureDefaultCouncilSeeded(params.userId);

  // Run council vote
  const council = await runCouncilVote({
    userId: params.userId,
    decisionId: params.decisionId,
  });

  // Generate scenarios
  const scenarios = await generateDecisionScenarios({
    userId: params.userId,
    decisionId: params.decisionId,
  });

  // Get decision and options for recommendation
  const [decisionRes, optionsRes] = await Promise.all([
    supabaseAdmin
      .from('decisions')
      .select('*')
      .eq('id', params.decisionId)
      .eq('user_id', dbUserId)
      .maybeSingle(),
    supabaseAdmin
      .from('decision_options')
      .select('*')
      .eq('decision_id', params.decisionId)
      .order('created_at', { ascending: true }),
  ]);

  const decision = decisionRes.data;
  const options = optionsRes.data ?? [];

  if (!decision || options.length === 0) {
    throw new Error('Decision or options not found');
  }

  // Use LLM to synthesize recommendation
  const voteSummary = council.votes.map((v) => {
    const option = options.find((o) => o.id === v.option_id);
    return {
      member: v.member_id,
      option: option?.label,
      rationale: v.rationale,
      confidence: v.confidence,
    };
  });

  const scenarioSummary = scenarios.map((s) => {
    const option = options.find((o) => o.id === s.option_id);
    return {
      option: option?.label,
      name: s.name,
      risk_score: s.risk_score,
      narrative: s.narrative_summary,
    };
  });

  const result = await callAIJson<{
    recommended_option_label: string;
    recommended_summary: string;
    conditions: string[];
    next_actions: string[];
  }>({
    userId: params.userId,
    feature: 'boardroom_recommendation',
    systemPrompt: `You are synthesizing a Boardroom Brain recommendation from council votes and scenarios.

Return JSON with:
- recommended_option_label: The label of the recommended option
- recommended_summary: 2-3 paragraph summary explaining the recommendation
- conditions: Array of conditions under which this recommendation might change
- next_actions: Array of 3-5 concrete next actions`,
    userPrompt: `Decision: ${decision.title}\n${decision.description ? `\n${decision.description}` : ''}\n\nCouncil Votes:\n${JSON.stringify(voteSummary, null, 2)}\n\nScenarios:\n${JSON.stringify(scenarioSummary, null, 2)}`,
    maxTokens: 2000,
    temperature: 0.7,
  });

  if (!result.success || !result.data) {
    // Fallback: use majority vote
    const voteCounts = new Map<string, number>();
    council.votes.forEach((v) => {
      const count = voteCounts.get(v.option_id) ?? 0;
      voteCounts.set(v.option_id, count + 1);
    });
    const majorityOptionId = Array.from(voteCounts.entries())
      .sort((a, b) => b[1] - a[1])[0]?.[0];
    const majorityOption = options.find((opt: any) => opt.id === majorityOptionId);

    return {
      council,
      scenarios,
      recommendedOptionId: majorityOptionId,
      recommendedSummary: `Based on council votes, the majority recommendation is: ${majorityOption?.label ?? 'No clear recommendation'}`,
    };
  }

  const { recommended_option_label, recommended_summary, conditions, next_actions } = result.data;

  const recommendedOption = options.find((opt: any) => opt.label === recommended_option_label);

  return {
    council,
    scenarios,
    recommendedOptionId: recommendedOption?.id,
    recommendedSummary: recommended_summary,
  };
}


