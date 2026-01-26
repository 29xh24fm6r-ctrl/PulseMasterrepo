// lib/omega/nodes/simulator.ts
// Simulator: Test hypothetical scenarios before action

import { executeOmegaPrompt } from "../llm";
import { OMEGA_PROMPTS } from "../prompts";
import type { OmegaState, Simulation, ReasoningStep } from "../types";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

interface SimulationScenario {
  scenario: string;
  probability: number;
  steps: { action: string; outcome: string }[];
  predicted_outcome: string;
  risks: string[];
  opportunities: string[];
}

interface SimulatorOutput {
  simulations: SimulationScenario[];
  recommendation: 'proceed' | 'modify' | 'abort';
  reasoning: string;
  modifications_if_needed?: string[];
  confidence: number;
}

export async function simulate(state: OmegaState): Promise<Partial<OmegaState>> {
  const startTime = Date.now();

  if (!state.draft) {
    return {
      simulations: [],
      reasoningTrace: [...state.reasoningTrace, {
        step: state.reasoningTrace.length + 1,
        action: 'simulate',
        input: {},
        output: {},
        reasoning: 'Skipped: No draft to simulate',
        durationMs: 0
      }]
    };
  }

  try {
    const supabase = getSupabaseAdmin();

    // Fetch historical outcomes and strategies
    const [outcomesResult, strategiesResult] = await Promise.all([
      supabase
        .from('pulse_outcomes')
        .select('*, draft:pulse_drafts(*)')
        .eq('user_id', state.userId)
        .order('created_at', { ascending: false })
        .limit(20),
      supabase
        .from('pulse_strategies')
        .select('*')
        .eq('user_id', state.userId)
        .eq('active', true)
        .limit(15)
    ]);

    const outcomes = outcomesResult.data || [];
    const strategies = strategiesResult.data || [];

    // Build current state from context
    const currentState = {
      draft: {
        type: state.draft.draftType,
        title: state.draft.title,
        confidence: state.draft.confidence
      },
      intent: state.intent,
      activeGoals: state.context?.activeGoals?.slice(0, 5),
      recentObservations: state.observations?.slice(0, 3)
    };

    const result = await executeOmegaPrompt<SimulatorOutput>(
      OMEGA_PROMPTS.SIMULATE,
      {
        action: {
          type: state.draft.draftType,
          title: state.draft.title,
          content: state.draft.content.body?.slice(0, 500),
          confidence: state.draft.confidence
        },
        state: currentState,
        history: outcomes.map(o => ({
          type: o.outcome_type,
          draftType: o.draft?.draft_type,
          rating: o.user_rating
        })),
        strategies: strategies.map(s => ({
          type: s.strategy_type,
          pattern: s.pattern,
          confidence: s.confidence
        }))
      }
    );

    const durationMs = Date.now() - startTime;

    // Store simulation
    const simulationRecord = await supabase
      .from('pulse_simulations')
      .insert({
        user_id: state.userId,
        simulation_type: 'strategy_test',
        hypothesis: `Testing draft execution: ${state.draft.title}`,
        input_state: currentState,
        simulated_actions: result.simulations.map(s => ({ scenario: s.scenario, steps: s.steps })),
        predicted_outcomes: result.simulations.map(s => ({
          scenario: s.scenario,
          probability: s.probability,
          outcome: s.predicted_outcome,
          risks: s.risks,
          opportunities: s.opportunities
        }))
      })
      .select()
      .single();

    const simulation: Simulation = {
      id: simulationRecord.data?.id || crypto.randomUUID(),
      userId: state.userId,
      simulationType: 'strategy_test',
      hypothesis: `Testing draft execution: ${state.draft.title}`,
      inputState: currentState,
      simulatedActions: result.simulations.map(s => ({ scenario: s.scenario, steps: s.steps })),
      predictedOutcomes: result.simulations.map(s => ({
        scenario: s.scenario,
        probability: s.probability,
        outcome: s.predicted_outcome
      })),
      createdAt: new Date().toISOString()
    };

    // Create reasoning step
    const step: ReasoningStep = {
      step: state.reasoningTrace.length + 1,
      action: 'simulate',
      input: { draftTitle: state.draft.title },
      output: {
        recommendation: result.recommendation,
        scenariosCount: result.simulations.length,
        confidence: result.confidence
      },
      reasoning: result.reasoning,
      durationMs
    };

    // Store trace
    await supabase.from('pulse_reasoning_traces').insert({
      user_id: state.userId,
      session_id: state.sessionId,
      trace_type: 'simulation',
      input_context: { draft: state.draft.id },
      reasoning_steps: [step],
      output: { recommendation: result.recommendation, modifications: result.modifications_if_needed },
      duration_ms: durationMs,
      success: true
    });

    return {
      simulations: [simulation],
      reasoningTrace: [...state.reasoningTrace, step]
    };
  } catch (error) {
    const durationMs = Date.now() - startTime;
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    const step: ReasoningStep = {
      step: state.reasoningTrace.length + 1,
      action: 'simulate',
      input: { draftTitle: state.draft?.title },
      output: {},
      reasoning: `Failed: ${errorMessage}`,
      durationMs
    };

    return {
      simulations: [],
      reasoningTrace: [...state.reasoningTrace, step],
      error: errorMessage
    };
  }
}
