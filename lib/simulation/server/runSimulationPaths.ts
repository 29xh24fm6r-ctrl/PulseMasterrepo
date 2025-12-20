// lib/simulation/server/runSimulationPaths.ts
import "server-only";

/**
 * Server-only simulation runner.
 * This is where we are allowed to import the AGI orchestrator/kernel/etc.
 *
 * The UI must NEVER import anything from /server.
 */

import { supabaseAdmin } from "@/lib/supabase/admin";
import { encodeUserModelToTwin } from "../encode";
import { runSimulation, SimulationInput } from "../scenario";
import { decodeSimulationToOutput } from "../decode";
import { DigitalTwinState } from "../twin";

export interface SimulationRunResult {
  id: string;
  scenarioName: string;
  output: any;
  createdAt: string;
}

export type SimulationRunRequest = {
  userId: string;
  mode: "single" | "all";
  dealId: string | null;
  pathIds: string[] | null;
  input: Record<string, any>;
  requestId?: string; // Optional for logging
  route?: string; // Optional route identifier
};

/**
 * Run a simulation scenario (server-only, can use AGI)
 */
export async function runSimulationScenario(
  userId: string,
  scenarioName: string,
  input: SimulationInput
): Promise<SimulationRunResult> {
  // Get user's database ID
  const { data: userRow } = await supabaseAdmin
    .from("users")
    .select("id")
    .eq("clerk_id", userId)
    .single();

  const dbUserId = userRow?.id || userId;

  // Build digital twin from current user state
  const initialTwin = await encodeUserModelToTwin(userId);

  // Save twin snapshot
  await supabaseAdmin.from("simulation_models").insert({
    user_id: dbUserId,
    version: "v2",
    state: initialTwin,
  });

  // Run simulation
  const steps = runSimulation(initialTwin, input);

  // Decode to insights
  const output = await decodeSimulationToOutput(
    initialTwin,
    steps,
    scenarioName,
    input.adjustments
  );

  // Save simulation run
  const { data: run } = await supabaseAdmin
    .from("simulation_runs")
    .insert({
      user_id: dbUserId,
      scenario_name: scenarioName,
      parameters: input,
      output,
    })
    .select("*")
    .single();

  if (!run) {
    throw new Error("Failed to save simulation run");
  }

  // Save metrics for charting
  if (output.metrics && output.metrics.length > 0) {
    const metricsToInsert = output.metrics.map((metric) => ({
      simulation_id: run.id,
      label: "energy",
      value: metric.energy,
      day_offset: metric.day,
    }))
      .concat(
        output.metrics.map((metric) => ({
          simulation_id: run.id,
          label: "stress",
          value: metric.stress,
          day_offset: metric.day,
        }))
      )
      .concat(
        output.metrics.map((metric) => ({
          simulation_id: run.id,
          label: "career_velocity",
          value: metric.career_velocity,
          day_offset: metric.day,
        }))
      );

    await supabaseAdmin.from("simulation_metrics").insert(metricsToInsert);
  }

  return {
    id: run.id,
    scenarioName: run.scenario_name,
    output,
    createdAt: run.created_at,
  };
}

/**
 * Wrapper for API routes - accepts flexible input/options format
 */
export async function runSimulationPaths(req: SimulationRunRequest): Promise<SimulationRunResult> {
  const { userId, input, requestId } = req;

  // Import logging if requestId provided
  let log: ReturnType<typeof import("./log").simLog> | null = null;
  if (requestId) {
    const { simLog } = await import("./log");
    log = simLog(requestId);
    log.info("runSimulationPaths called", { mode: req.mode, dealId: req.dealId, pathIds: req.pathIds?.length || 0 });
  }

  // Extract scenarioName from input, default to "custom"
  const scenarioName = input?.scenarioName || "custom";
  
  // Normalize input to SimulationInput format
  const simulationInput: SimulationInput = {
    days: input?.days || 90,
    adjustments: input?.adjustments || {},
  };

  if (log) {
    log.info("Running simulation scenario", { scenarioName, days: simulationInput.days });
  }

  const result = await runSimulationScenario(userId, scenarioName, simulationInput);

  if (log) {
    log.info("Simulation scenario completed", { resultId: result.id });
  }

  return result;
}

/**
 * Get predefined scenario inputs (legacy format - kept for backward compatibility)
 */
export function getPredefinedScenarios(): Array<{
  name: string;
  displayName: string;
  input: SimulationInput;
}> {
  return [
    {
      name: "maintain_current",
      displayName: "Maintain Current Path",
      input: {
        days: 90,
        adjustments: {},
      },
    },
    {
      name: "focus_healing",
      displayName: "Focus Healing",
      input: {
        days: 90,
        adjustments: {
          increase_healing: 80,
          reduce_stressors: 60,
        },
      },
    },
    {
      name: "career_sprint",
      displayName: "Career Sprint",
      input: {
        days: 90,
        adjustments: {
          increase_career: 70,
          double_down_on_performance: true,
        },
      },
    },
    {
      name: "performance_push",
      displayName: "Performance Push",
      input: {
        days: 60,
        adjustments: {
          double_down_on_performance: true,
        },
      },
    },
    {
      name: "balance_mode",
      displayName: "Balance Mode",
      input: {
        days: 90,
        adjustments: {
          increase_healing: 40,
          increase_career: 40,
          improve_habits: 50,
        },
      },
    },
  ];
}

/**
 * List simulation scenarios (new format with id/title)
 */
export async function listSimulationScenarios(): Promise<SimulationScenario[]> {
  const predefined = getPredefinedScenarios();
  return predefined.map((s) => ({
    id: s.name,
    title: s.displayName,
    mode: "all" as const,
    input: s.input,
  }));
}

/**
 * Get scenario by ID
 */
export function getScenarioById(id: string): SimulationScenario | null {
  const predefined = getPredefinedScenarios();
  const scenario = predefined.find((s) => s.name === id);
  if (!scenario) return null;
  
  return {
    id: scenario.name,
    title: scenario.displayName,
    mode: "all" as const,
    input: scenario.input,
  };
}

