// Strategy Snapshot Planner
// lib/strategy/planner.ts

import { supabaseAdmin } from "@/lib/supabase";
import { buildStrategyModel, StrategyModel } from "./model";
import { generateStrategyPathOptions, StrategyPathCandidate } from "./options";
import { generatePillarsAndActionsForSnapshot } from "./actions";
import { llmComplete } from "@/lib/llm/client";

export interface StrategySnapshotResult {
  snapshotId: string;
  model: any;
  paths: StrategyPathCandidate[];
  selectedPathKey: string;
}

/**
 * Build strategy snapshot
 */
export async function buildStrategySnapshot(
  userId: string,
  horizonDays: number = 90
): Promise<StrategySnapshotResult> {
  // Get user's database ID
  const { data: userRow } = await supabaseAdmin
    .from("users")
    .select("id")
    .eq("clerk_id", userId)
    .single();

  const dbUserId = userRow?.id || userId;

  // 1. Build strategy model
  const model = await buildStrategyModel(userId, horizonDays);

  // 2. Generate path options
  const paths = await generateStrategyPathOptions(model);

  if (paths.length === 0) {
    throw new Error("No strategy paths generated");
  }

  // 3. Choose highest scoring path
  const selected = paths.reduce((best, p) => (p.score > best.score ? p : best), paths[0]);

  // 4. Generate summary
  const summary = buildSnapshotSummaryText(model, selected);

  // 5. Save snapshot
  const { data: snapshot } = await supabaseAdmin
    .from("strategy_snapshots")
    .insert({
      user_id: dbUserId,
      horizon_days: horizonDays,
      model,
      summary,
      chosen_path_key: selected.key,
      confidence: selected.score,
    })
    .select("*")
    .single();

  if (!snapshot) {
    throw new Error("Failed to create strategy snapshot");
  }

  // 6. Save paths
  const pathsToInsert = paths.map((path) => ({
    snapshot_id: snapshot.id,
    key: path.key,
    name: path.name,
    description: path.description,
    pros: path.pros,
    cons: path.cons,
    risk_level: path.riskLevel,
    opportunity_level: path.opportunityLevel,
    score: path.score,
    is_selected: path.key === selected.key,
  }));

  await supabaseAdmin.from("strategy_paths").insert(pathsToInsert);

  // Get the selected path ID
  const { data: selectedPathRow } = await supabaseAdmin
    .from("strategy_paths")
    .select("id")
    .eq("snapshot_id", snapshot.id)
    .eq("is_selected", true)
    .single();

  // 7. Generate pillars and actions
  if (selectedPathRow) {
    await generatePillarsAndActionsForSnapshot(snapshot.id, selectedPathRow.id, model, selected);
  }

  return {
    snapshotId: snapshot.id,
    model,
    paths,
    selectedPathKey: selected.key,
  };
}

/**
 * Build snapshot summary text
 */
async function buildSnapshotSummaryText(
  model: StrategyModel,
  selectedPath: StrategyPathCandidate
): Promise<string> {
  const prompt = `Generate a concise, safe summary (2-3 sentences) for this strategy snapshot:

Strategy: ${selectedPath.name}
Description: ${selectedPath.description}
Horizon: ${model.horizonDays} days

User's Context:
- Top Life Arc: ${model.currentFocus.topArcKey || "none"}
- Burnout Risk: ${model.risks.burnout}%
- Career Upside: ${model.opportunities.careerUpside}%

Use probabilistic language ("may", "could", "appears to be"). Avoid guarantees.

Output just the summary text, no JSON.`;

  try {
    const response = await llmComplete(prompt, {
      model: "gpt-4o-mini",
      temperature: 0.7,
      max_tokens: 150,
    });

    return typeof response === "string" ? response : `Your ${model.horizonDays}-day strategy: ${selectedPath.name}. ${selectedPath.description}`;
  } catch (err) {
    return `Your ${model.horizonDays}-day strategy: ${selectedPath.name}. ${selectedPath.description}`;
  }
}

