// lib/omega/nodes/observer.ts
// Observer node: Analyze current situation and identify patterns

import { executeOmegaPrompt } from "../llm";
import { OMEGA_PROMPTS } from "../prompts";
import type {
  OmegaState,
  Observation,
  NodeResult,
  ReasoningStep,
  ReasoningTrace,
  Outcome,
  Strategy
} from "../types";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

interface ObserverOutput {
  observations: Observation[];
  current_state_assessment: string;
  emerging_patterns?: string[];
  attention_required?: string[];
}

export async function observe(state: OmegaState): Promise<Partial<OmegaState>> {
  const startTime = Date.now();

  try {
    // Fetch recent traces
    const supabase = getSupabaseAdmin();
    const [tracesResult, outcomesResult, strategiesResult] = await Promise.all([
      supabase
        .from('pulse_reasoning_traces')
        .select('*')
        .eq('user_id', state.userId)
        .order('created_at', { ascending: false })
        .limit(10),
      supabase
        .from('pulse_outcomes')
        .select('*')
        .eq('user_id', state.userId)
        .order('created_at', { ascending: false })
        .limit(10),
      supabase
        .from('pulse_strategies')
        .select('*')
        .eq('user_id', state.userId)
        .eq('active', true)
        .limit(20)
    ]);

    const traces = tracesResult.data || [];
    const outcomes = outcomesResult.data || [];
    const strategies = strategiesResult.data || [];

    const result = await executeOmegaPrompt<ObserverOutput>(
      OMEGA_PROMPTS.OBSERVE,
      {
        signal: state.signal || {},
        traces: traces.slice(0, 5),
        outcomes: outcomes.slice(0, 5),
        strategies: strategies.slice(0, 10)
      }
    );

    const durationMs = Date.now() - startTime;

    // Create reasoning step
    const step: ReasoningStep = {
      step: state.reasoningTrace.length + 1,
      action: 'observe',
      input: { signal: state.signal, tracesCount: traces.length },
      output: result,
      reasoning: result.current_state_assessment,
      durationMs
    };

    // Store trace
    await supabase.from('pulse_reasoning_traces').insert({
      user_id: state.userId,
      session_id: state.sessionId,
      trace_type: 'observation',
      input_context: { signal: state.signal },
      reasoning_steps: [step],
      output: result,
      duration_ms: durationMs,
      success: true
    });

    return {
      observations: result.observations,
      reasoningTrace: [...state.reasoningTrace, step]
    };
  } catch (error) {
    const durationMs = Date.now() - startTime;
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    const step: ReasoningStep = {
      step: state.reasoningTrace.length + 1,
      action: 'observe',
      input: { signal: state.signal },
      output: {},
      reasoning: `Failed: ${errorMessage}`,
      durationMs
    };

    return {
      observations: [],
      reasoningTrace: [...state.reasoningTrace, step],
      error: errorMessage
    };
  }
}
