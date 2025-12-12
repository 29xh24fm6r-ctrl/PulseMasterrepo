// Strategy Pillars & Actions
// lib/strategy/actions.ts

import { supabaseAdmin } from "@/lib/supabase";
import { llmComplete } from "@/lib/llm/client";
import { StrategyModel } from "./model";
import { StrategyPathCandidate } from "./options";

/**
 * Generate pillars and actions for a strategy snapshot
 */
export async function generatePillarsAndActionsForSnapshot(
  snapshotId: string,
  pathId: string,
  model: StrategyModel,
  selectedPath: StrategyPathCandidate
): Promise<void> {
  // Get user's database ID from snapshot
  const { data: snapshot } = await supabaseAdmin
    .from("strategy_snapshots")
    .select("user_id")
    .eq("id", snapshotId)
    .single();

  if (!snapshot) return;

  const dbUserId = snapshot.user_id;

  // Get life arcs for linking
  const { data: lifeArcs } = await supabaseAdmin
    .from("life_arcs")
    .select("id, key")
    .eq("user_id", dbUserId)
    .eq("status", "active");

  const arcMap = new Map(lifeArcs?.map((a) => [a.key, a.id]) || []);

  // Generate pillars using LLM
  const prompt = `Generate 3-5 strategic pillars for this ${model.horizonDays}-day strategy:

Strategy Path: ${selectedPath.name}
Description: ${selectedPath.description}

User's Current State:
- Top Life Arc: ${model.currentFocus.topArcKey || "none"}
- Burnout Risk: ${model.risks.burnout}%
- Career Upside: ${model.opportunities.careerUpside}%
- Stress: ${model.twin.stress}
- Energy: ${model.twin.energy}

Generate strategic pillars (high-level themes, not micro-tasks). Each pillar should:
- Have a clear title (3-5 words)
- Have a 1-2 sentence description
- Be categorized (healing, career, relationship, identity, foundation)
- Have priority 1-3 (1 = highest)

Output JSON array:
[
  {
    "title": "Pillar title",
    "description": "Pillar description",
    "category": "healing|career|relationship|identity|foundation",
    "priority": 1-3,
    "actions": [
      {
        "title": "Action title",
        "description": "Action description",
        "cadence": "daily|3x_week|weekly|once",
        "lifeArcKey": "healing|career_level_up|performance_push|identity_rebuild|financial_reset" (optional)
      }
    ]
  }
]`;

  try {
    const response = await llmComplete(prompt, {
      model: "gpt-4o-mini",
      temperature: 0.7,
      json: true,
      max_tokens: 800,
    });

    const parsed = typeof response === "string" ? JSON.parse(response) : response;
    const pillars = Array.isArray(parsed) ? parsed : [];

    // Save pillars and actions
    for (const pillarData of pillars.slice(0, 5)) {
      const { data: pillar } = await supabaseAdmin
        .from("strategy_pillars")
        .insert({
          snapshot_id: snapshotId,
          path_id: pathId,
          title: pillarData.title || "Strategic Pillar",
          description: pillarData.description || "",
          category: pillarData.category || "foundation",
          priority: Math.max(1, Math.min(3, pillarData.priority || 2)),
        })
        .select("*")
        .single();

      if (pillar && pillarData.actions) {
        // Save actions
        for (const actionData of pillarData.actions.slice(0, 4)) {
          const lifeArcId = actionData.lifeArcKey
            ? arcMap.get(actionData.lifeArcKey) || null
            : null;

          await supabaseAdmin.from("strategy_actions").insert({
            pillar_id: pillar.id,
            life_arc_id: lifeArcId,
            title: actionData.title || "Action",
            description: actionData.description || "",
            cadence: actionData.cadence || "weekly",
          });
        }
      }
    }
  } catch (err) {
    console.error(`[StrategyActions] Failed to generate pillars:`, err);
    // Create default pillars
    await createDefaultPillars(snapshotId, pathId, selectedPath, arcMap);
  }
}

/**
 * Create default pillars if LLM fails
 */
async function createDefaultPillars(
  snapshotId: string,
  pathId: string,
  selectedPath: StrategyPathCandidate,
  arcMap: Map<string, string>
): Promise<void> {
  const defaults: Array<{
    title: string;
    description: string;
    category: string;
    priority: number;
    actions: Array<{ title: string; cadence: string; lifeArcKey?: string }>;
  }> = [];

  if (selectedPath.key === "healing_focus") {
    defaults.push(
      {
        title: "Stabilize Sleep & Stress",
        description: "Prioritize rest and stress management",
        category: "healing",
        priority: 1,
        actions: [
          { title: "Sleep ≥ 7h 5 nights/week", cadence: "daily", lifeArcKey: "healing" },
          { title: "Daily stress management practice", cadence: "daily", lifeArcKey: "healing" },
        ],
      },
      {
        title: "Emotional Check-ins",
        description: "Regular reflection and emotional processing",
        category: "healing",
        priority: 2,
        actions: [
          { title: "Weekly Confidant reflection", cadence: "weekly", lifeArcKey: "healing" },
        ],
      }
    );
  } else if (selectedPath.key === "career_sprint") {
    defaults.push(
      {
        title: "Deep Work Blocks",
        description: "Protected time for high-value career work",
        category: "career",
        priority: 1,
        actions: [
          { title: "Daily 60-min deep-work block", cadence: "daily", lifeArcKey: "career_level_up" },
          { title: "Pipeline review 3x/week", cadence: "3x_week", lifeArcKey: "career_level_up" },
        ],
      }
    );
  } else {
    // Balanced ascent
    defaults.push(
      {
        title: "Balance Energy & Growth",
        description: "Maintain healing while advancing career",
        category: "foundation",
        priority: 1,
        actions: [
          { title: "Sleep ≥ 7h 5 nights/week", cadence: "daily" },
          { title: "Daily deep-work block", cadence: "daily", lifeArcKey: "career_level_up" },
        ],
      }
    );
  }

  for (const pillarData of defaults) {
    const { data: pillar } = await supabaseAdmin
      .from("strategy_pillars")
      .insert({
        snapshot_id: snapshotId,
        path_id: pathId,
        title: pillarData.title,
        description: pillarData.description,
        category: pillarData.category,
        priority: pillarData.priority,
      })
      .select("*")
      .single();

    if (pillar) {
      for (const actionData of pillarData.actions) {
        const lifeArcId = actionData.lifeArcKey
          ? arcMap.get(actionData.lifeArcKey) || null
          : null;

        await supabaseAdmin.from("strategy_actions").insert({
          pillar_id: pillar.id,
          life_arc_id: lifeArcId,
          title: actionData.title,
          description: "",
          cadence: actionData.cadence,
        });
      }
    }
  }
}




