// Boardroom Brain v1 - Strategic Mind Core
// lib/boardroom/strategic_mind.ts

import "server-only";
import { supabaseAdmin } from '@/lib/supabase/admin';
import { callAIJson } from '@/lib/ai/call';
import { StrategicPlaybook, StrategicPlan } from './types';

async function resolveUserId(clerkId: string): Promise<string> {
  const { data: userRow } = await supabaseAdmin
    .from("users")
    .select("id")
    .eq("clerk_id", clerkId)
    .maybeSingle();

  return userRow?.id || clerkId;
}

export async function suggestStrategicPlaybooks(params: {
  userId: string;
  objectiveId: string;
}): Promise<StrategicPlaybook[]> {
  const dbUserId = await resolveUserId(params.userId);

  // Get objective and domain
  const { data: objective, error: objError } = await supabaseAdmin
    .from('strategic_objectives')
    .select('*, strategic_domains(*)')
    .eq('id', params.objectiveId)
    .eq('user_id', dbUserId)
    .maybeSingle();

  if (objError) throw objError;
  if (!objective) throw new Error('Objective not found');

  // Get relevant metrics (finance, deals, time)
  const [financeRes, dealsRes] = await Promise.all([
    supabaseAdmin
      .from('financial_state_snapshots')
      .select('*')
      .eq('user_id', dbUserId)
      .order('snapshot_time', { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabaseAdmin
      .from('deals')
      .select('*')
      .eq('user_id', dbUserId)
      .in('status', ['active', 'negotiating'])
      .limit(10),
  ]);

  const finance = financeRes.data;
  const deals = dealsRes.data ?? [];

  // Get all playbooks
  const { data: allPlaybooks } = await supabaseAdmin
    .from('strategic_playbooks')
    .select('*');

  if (!allPlaybooks || allPlaybooks.length === 0) {
    return [];
  }

  // Use LLM to rank playbooks
  const result = await callAIJson<{
    ranked_playbooks: Array<{ slug: string; fit_score: number; reasoning: string }>;
  }>({
    userId: params.userId,
    feature: 'strategic_playbook_suggestion',
    systemPrompt: `You are a Strategic Advisor. Analyze an objective and available playbooks, then rank which playbooks best fit the objective and constraints.

Return JSON with ranked_playbooks array, each with:
- slug: the playbook slug
- fit_score: 0-1 how well it fits
- reasoning: brief explanation`,
    userPrompt: `Objective:\n${JSON.stringify(objective, null, 2)}\n\nFinancial Context:\n${JSON.stringify(finance, null, 2)}\n\nActive Deals:\n${JSON.stringify(deals.slice(0, 5), null, 2)}\n\nAvailable Playbooks:\n${JSON.stringify(allPlaybooks.map((p: any) => ({ slug: p.slug, name: p.name, description: p.description, domain_hint: p.domain_hint })), null, 2)}`,
    maxTokens: 2000,
    temperature: 0.7,
  });

  if (!result.success || !result.data) {
    // Fallback: return all playbooks
    return allPlaybooks;
  }

  // Sort by fit score and return top 3-5
  const ranked = result.data.ranked_playbooks
    .sort((a, b) => b.fit_score - a.fit_score)
    .slice(0, 5);

  const playbookMap = new Map(allPlaybooks.map((p: any) => [p.slug, p]));
  return ranked.map((r) => playbookMap.get(r.slug)).filter(Boolean) as StrategicPlaybook[];
}

export async function generateStrategicPlanDraft(params: {
  userId: string;
  objectiveId: string;
  selectedPlaybookId: string;
}): Promise<StrategicPlan> {
  const dbUserId = await resolveUserId(params.userId);

  // Get objective and playbook
  const [objectiveRes, playbookRes] = await Promise.all([
    supabaseAdmin
      .from('strategic_objectives')
      .select('*, strategic_domains(*)')
      .eq('id', params.objectiveId)
      .eq('user_id', dbUserId)
      .maybeSingle(),
    supabaseAdmin
      .from('strategic_playbooks')
      .select('*')
      .eq('id', params.selectedPlaybookId)
      .maybeSingle(),
  ]);

  const objective = objectiveRes.data;
  const playbook = playbookRes.data;

  if (!objective) throw new Error('Objective not found');
  if (!playbook) throw new Error('Playbook not found');

  // Get context
  const [financeRes] = await Promise.all([
    supabaseAdmin
      .from('financial_state_snapshots')
      .select('*')
      .eq('user_id', dbUserId)
      .order('snapshot_time', { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  const finance = financeRes.data;

  // Use LLM to generate plan
  const result = await callAIJson<{
    name: string;
    summary: string;
    assumptions: string[];
    risk_register: Array<{ risk: string; likelihood: string; impact: string; mitigation: string }>;
  }>({
    userId: params.userId,
    feature: 'strategic_plan_generation',
    systemPrompt: `You are a Strategic Planner. Generate a strategic plan draft based on an objective and selected playbook.

Return JSON with:
- name: Plan name
- summary: 2-3 paragraph summary
- assumptions: Array of key assumptions
- risk_register: Array of {risk, likelihood, impact, mitigation}`,
    userPrompt: `Objective:\n${JSON.stringify(objective, null, 2)}\n\nPlaybook:\n${JSON.stringify(playbook, null, 2)}\n\nFinancial Context:\n${JSON.stringify(finance, null, 2)}`,
    maxTokens: 3000,
    temperature: 0.7,
  });

  if (!result.success || !result.data) {
    throw new Error(`Failed to generate plan: ${result.error}`);
  }

  const { name, summary, assumptions, risk_register } = result.data;

  // Create plan
  const { data: plan, error } = await supabaseAdmin
    .from('strategic_plans')
    .insert({
      user_id: dbUserId,
      objective_id: params.objectiveId,
      primary_playbook_id: params.selectedPlaybookId,
      name: name || `${playbook.name} for ${objective.name}`,
      summary: summary || '',
      assumptions: assumptions ?? [],
      risk_register: risk_register ?? [],
      status: 'draft',
    })
    .select('*')
    .single();

  if (error) throw error;
  return plan;
}


