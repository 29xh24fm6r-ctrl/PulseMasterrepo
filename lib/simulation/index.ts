// Life Simulation Engine
import { createClient } from "@supabase/supabase-js";
import { llmJson } from "../llm/client";

function getSupabase() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
}

export interface Simulation {
  id: string;
  user_id: string;
  title: string;
  description?: string;
  simulation_type: string;
  status: "draft" | "running" | "completed" | "archived";
  base_scenario: Record<string, any>;
  variables: any[];
  time_horizon?: string;
  outcomes?: any[];
  recommended_path?: string;
  confidence?: number;
}

export interface WhatIf {
  id: string;
  user_id: string;
  question: string;
  category?: string;
  key_factors: string[];
  potential_outcomes: any[];
  risks: string[];
  benefits: string[];
  recommendation?: string;
}

export async function analyzeWhatIf(userId: string, question: string, context?: Record<string, any>): Promise<WhatIf> {
  const supabase = getSupabase();
  const contextStr = context ? Object.entries(context).map(([k, v]) => k + ": " + JSON.stringify(v)).join("\n") : "No additional context";

  const prompt = `Analyze this "what if" question.

Context:
${contextStr}

Question: "${question}"

Return JSON:
{
  "category": "career|relationship|financial|health|lifestyle|education|other",
  "key_factors": ["factor1", "factor2"],
  "potential_outcomes": [{"outcome": "description", "probability": "high|medium|low", "impact": "positive|neutral|negative"}],
  "risks": ["risk1", "risk2"],
  "benefits": ["benefit1", "benefit2"],
  "recommendation": "A balanced recommendation"
}`;

  const analysis = await llmJson({ prompt });

  const { data, error } = await supabase.from("sim_what_ifs").insert({
    user_id: userId,
    question,
    category: analysis.category,
    key_factors: analysis.key_factors,
    potential_outcomes: analysis.potential_outcomes,
    risks: analysis.risks,
    benefits: analysis.benefits,
    recommendation: analysis.recommendation,
  }).select().single();

  if (error) throw error;
  return data;
}

export async function createSimulation(userId: string, input: { title: string; description?: string; type: string; baseScenario: Record<string, any>; variables?: any[]; timeHorizon?: string }): Promise<Simulation> {
  const supabase = getSupabase();
  const { data, error } = await supabase.from("sim_simulations").insert({
    user_id: userId,
    title: input.title,
    description: input.description,
    simulation_type: input.type,
    base_scenario: input.baseScenario,
    variables: input.variables || [],
    time_horizon: input.timeHorizon,
    status: "draft",
  }).select().single();
  if (error) throw error;
  return data;
}

export async function runSimulation(simulationId: string): Promise<{ scenarios: any[]; recommendedPath: string }> {
  const supabase = getSupabase();
  const { data: simulation } = await supabase.from("sim_simulations").select("*").eq("id", simulationId).single();
  if (!simulation) throw new Error("Simulation not found");

  await supabase.from("sim_simulations").update({ status: "running" }).eq("id", simulationId);

  const prompt = `Generate scenarios for this simulation.

Title: ${simulation.title}
Type: ${simulation.simulation_type}
Current State: ${JSON.stringify(simulation.base_scenario)}
Time Horizon: ${simulation.time_horizon || "1 year"}

Return JSON:
{
  "scenarios": [{"name": "...", "type": "baseline|optimistic|pessimistic", "narrative": "...", "probability": 0.0-1.0, "desirability": 0.0-1.0}],
  "recommended_path": "Which approach is recommended"
}`;

  const result = await llmJson({ prompt });

  const scenarios: any[] = [];
  for (const s of result.scenarios) {
    const { data } = await supabase.from("sim_scenarios").insert({
      simulation_id: simulationId,
      user_id: simulation.user_id,
      scenario_name: s.name,
      scenario_type: s.type,
      assumptions: s.assumptions || [],
      decisions: s.decisions || [],
      projected_outcomes: s.projected_outcomes || {},
      probability: s.probability,
      desirability: s.desirability,
      narrative: s.narrative,
    }).select().single();
    if (data) scenarios.push(data);
  }

  await supabase.from("sim_simulations").update({ status: "completed", outcomes: result.scenarios, recommended_path: result.recommended_path, completed_at: new Date().toISOString() }).eq("id", simulationId);

  return { scenarios, recommendedPath: result.recommended_path };
}

export async function generateDecisionTree(simulationId: string, rootDecision: string): Promise<any> {
  const supabase = getSupabase();
  const { data: simulation } = await supabase.from("sim_simulations").select("*").eq("id", simulationId).single();
  if (!simulation) throw new Error("Simulation not found");

  const prompt = `Create a decision tree.

Context: ${simulation.title}
Root Decision: ${rootDecision}

Return JSON:
{
  "root": {"decision": "...", "options": [{"choice": "A", "probability": 0.5, "outcome": "..."}]},
  "optimal_path": [{"decision": "...", "choice": "..."}],
  "total_branches": 4,
  "max_depth": 2
}`;

 const tree = await llmJson({ prompt }); 

  const { data, error } = await supabase.from("sim_decision_trees").insert({
    simulation_id: simulationId,
    user_id: simulation.user_id,
    root_decision: rootDecision,
    tree_data: tree.root,
    optimal_path: tree.optimal_path,
    total_branches: tree.total_branches,
    max_depth: tree.max_depth,
  }).select().single();

  if (error) throw error;
  return data;
}

export async function getSimulations(userId: string, status?: string): Promise<Simulation[]> {
  const supabase = getSupabase();
  let query = supabase.from("sim_simulations").select("*").eq("user_id", userId).order("created_at", { ascending: false });
  if (status) query = query.eq("status", status);
  const { data } = await query.limit(20);
  return data || [];
}

export async function getWhatIfs(userId: string, limit = 20): Promise<WhatIf[]> {
  const supabase = getSupabase();
  const { data } = await supabase.from("sim_what_ifs").select("*").eq("user_id", userId).order("created_at", { ascending: false }).limit(limit);
  return data || [];
}

export const LifeSimulation = { analyzeWhatIf, createSimulation, runSimulation, generateDecisionTree, getSimulations, getWhatIfs };
export default LifeSimulation;