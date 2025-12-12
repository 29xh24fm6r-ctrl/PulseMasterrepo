// Boardroom Brain v1 - Decision Theater Engine
// lib/boardroom/decision_theater.ts

import { supabaseAdminClient } from '../supabase/admin';
import { callAIJson } from '@/lib/ai/call';
import { DecisionScenario, ScenarioParameters, ScenarioOutcomeSummary } from './types';

async function resolveUserId(clerkId: string): Promise<string> {
  const { data: userRow } = await supabaseAdminClient
    .from("users")
    .select("id")
    .eq("clerk_id", clerkId)
    .maybeSingle();

  return userRow?.id || clerkId;
}

export async function generateDecisionScenarios(params: {
  userId: string;
  decisionId: string;
}): Promise<DecisionScenario[]> {
  const dbUserId = await resolveUserId(params.userId);

  // Get decision and options
  const [decisionRes, optionsRes] = await Promise.all([
    supabaseAdminClient
      .from('decisions')
      .select('*')
      .eq('id', params.decisionId)
      .eq('user_id', dbUserId)
      .maybeSingle(),
    supabaseAdminClient
      .from('decision_options')
      .select('*')
      .eq('decision_id', params.decisionId)
      .order('created_at', { ascending: true }),
  ]);

  const decision = decisionRes.data;
  const options = optionsRes.data ?? [];

  if (!decision) throw new Error('Decision not found');
  if (options.length === 0) throw new Error('No options found');

  // Get current state for simulation
  const [financeRes, dealsRes, mythicRes] = await Promise.all([
    supabaseAdminClient
      .from('financial_state_snapshots')
      .select('*')
      .eq('user_id', dbUserId)
      .order('snapshot_time', { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabaseAdminClient
      .from('deals')
      .select('*')
      .eq('user_id', dbUserId)
      .in('status', ['active', 'negotiating'])
      .limit(10),
    supabaseAdminClient
      .from('user_mythic_profile')
      .select('*')
      .eq('user_id', dbUserId)
      .maybeSingle(),
  ]);

  const finance = financeRes.data;
  const deals = dealsRes.data ?? [];
  const mythic = mythicRes.data;

  const scenarios: DecisionScenario[] = [];

  // For each option, generate 3 scenarios: base, upside, downside
  for (const option of options) {
    const scenarioTypes = [
      { name: 'Base case', parameters: { probability: 0.5 } },
      { name: 'Upside', parameters: { probability: 0.2, multiplier: 1.3 } },
      { name: 'Downside', parameters: { probability: 0.3, multiplier: 0.7 } },
    ];

    for (const scenarioType of scenarioTypes) {
      // Use LLM to simulate outcome
      const result = await callAIJson<{
        narrative_summary: string;
        risk_score: number;
        outcomes: ScenarioOutcomeSummary;
      }>({
        userId: params.userId,
        feature: 'decision_scenario_simulation',
        systemPrompt: `You are a Scenario Simulator. Generate a realistic scenario outcome for a decision option.

Return JSON with:
- narrative_summary: 2-3 paragraph story of what happens
- risk_score: 0-10 risk level
- outcomes: {cash_flow, freedom_score, optionality, relationship_strain, key_metrics}`,
        userPrompt: `Decision: ${decision.title}\nOption: ${option.label}\n${option.description ? `Description: ${option.description}` : ''}\n\nScenario Type: ${scenarioType.name}\nParameters: ${JSON.stringify(scenarioType.parameters)}\n\nCurrent State:\nFinancial: ${JSON.stringify(finance, null, 2)}\nActive Deals: ${deals.length}\nMythic Chapter: ${mythic?.current_chapter_id ?? 'None'}`,
        maxTokens: 2000,
        temperature: 0.8,
      });

      if (!result.success || !result.data) {
        console.error(`Failed to generate scenario for ${option.label} - ${scenarioType.name}`);
        continue;
      }

      const { narrative_summary, risk_score, outcomes } = result.data;

      // Insert scenario
      const { data: scenario, error } = await supabaseAdminClient
        .from('decision_scenarios')
        .insert({
          decision_id: params.decisionId,
          option_id: option.id,
          name: scenarioType.name,
          parameters: scenarioType.parameters,
          simulated_outcomes: outcomes,
          narrative_summary: narrative_summary,
          risk_score: risk_score,
        })
        .select('*')
        .single();

      if (error) {
        console.error(`Failed to save scenario`, error);
        continue;
      }

      scenarios.push(scenario);
    }
  }

  return scenarios;
}


