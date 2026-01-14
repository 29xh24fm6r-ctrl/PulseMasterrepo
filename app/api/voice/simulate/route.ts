import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { createClient } from "@supabase/supabase-js";
import { llmJson } from "@/lib/llm/client";

import { createAdminClient } from "../_lib/env";

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { scenario } = await req.json();
  if (!scenario) {
    return NextResponse.json({ error: "Scenario required" }, { status: 400 });
  }

  const supabase = createAdminClient();

  // Step 1: Parse scenario into assumptions
  const parsePrompt = `Parse this life scenario into structured assumptions.

Scenario: "${scenario}"

Return JSON:
{
  "title": "short title for this scenario",
  "category": "career|relationship|financial|health|lifestyle|education",
  "assumptions": ["assumption 1", "assumption 2"],
  "key_variables": ["variable 1", "variable 2"],
  "time_horizon": "1_month|6_months|1_year|5_years"
}`;

  const parsed = await llmJson({ prompt: parsePrompt });

  // Step 2: Create sim_scenarios entry
  const { data: scenarioEntry, error: scenarioError } = await supabase
    .from("sim_scenarios")
    .insert({
      user_id: userId,
      title: parsed.title,
      description: scenario,
      category: parsed.category,
      assumptions: parsed.assumptions,
      variables: parsed.key_variables,
      time_horizon: parsed.time_horizon,
      status: "running",
    })
    .select()
    .single();

  if (scenarioError) {
    console.error("Failed to create scenario:", scenarioError);
    return NextResponse.json({ error: "Failed to create scenario" }, { status: 500 });
  }

  // Step 3: Run simulation
  const simPrompt = `Simulate this life scenario and provide outcomes.

Scenario: ${scenario}
Assumptions: ${parsed.assumptions.join(", ")}
Time horizon: ${parsed.time_horizon}

Return JSON:
{
  "baseline_outcome": "what happens if you do nothing",
  "positive_outcome": "best case scenario",
  "negative_outcome": "worst case scenario", 
  "probability_positive": 0.0-1.0,
  "key_risks": ["risk 1", "risk 2"],
  "key_benefits": ["benefit 1", "benefit 2"],
  "recommendation": "what you should do",
  "first_step": "immediate next action"
}`;

  const simulation = await llmJson({ prompt: simPrompt });

  // Step 4: Store sim_runs
  const { error: runError } = await supabase
    .from("sim_runs")
    .insert({
      user_id: userId,
      scenario_id: scenarioEntry.id,
      baseline_outcome: simulation.baseline_outcome,
      positive_outcome: simulation.positive_outcome,
      negative_outcome: simulation.negative_outcome,
      probability_positive: simulation.probability_positive,
      key_risks: simulation.key_risks,
      key_benefits: simulation.key_benefits,
      recommendation: simulation.recommendation,
      first_step: simulation.first_step,
    });

  if (runError) {
    console.error("Failed to store simulation run:", runError);
  }

  // Update scenario status
  await supabase
    .from("sim_scenarios")
    .update({ status: "completed" })
    .eq("id", scenarioEntry.id);

  // Step 5: Return spoken summary
  const spoken = `I've simulated "${parsed.title}". 
    Best case: ${simulation.positive_outcome}. 
    With about ${Math.round(simulation.probability_positive * 100)}% chance of success.
    Main risk: ${simulation.key_risks[0] || "unknown"}.
    My recommendation: ${simulation.recommendation}.
    Your first step should be: ${simulation.first_step}.`;

  return NextResponse.json({
    scenario_id: scenarioEntry.id,
    title: parsed.title,
    simulation,
    spoken: spoken.replace(/\s+/g, " ").trim()
  });
}