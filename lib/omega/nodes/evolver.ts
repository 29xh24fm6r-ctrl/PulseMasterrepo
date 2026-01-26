// lib/omega/nodes/evolver.ts
// Evolver: Propose improvements to the system

import { executeOmegaPrompt } from "../llm";
import { OMEGA_PROMPTS } from "../prompts";
import type { OmegaState, Improvement, ReasoningStep, ImprovementType } from "../types";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

interface ImprovementProposal {
  type: ImprovementType;
  target: string;
  current_state: Record<string, unknown>;
  proposed_change: Record<string, unknown>;
  expected_impact: string;
  risk: string;
  reversible: boolean;
  test_criteria: string;
}

interface EvolverOutput {
  improvements: ImprovementProposal[];
  priority_order?: string[];
  dependencies?: Record<string, string[]>;
  estimated_total_impact?: string;
}

export async function evolve(state: OmegaState): Promise<Partial<OmegaState>> {
  const startTime = Date.now();

  try {
    const supabase = getSupabaseAdmin();

    // Fetch current strategies and recent learnings
    const [strategiesResult, outcomesResult] = await Promise.all([
      supabase
        .from('pulse_strategies')
        .select('*')
        .eq('user_id', state.userId)
        .eq('active', true)
        .limit(20),
      supabase
        .from('pulse_outcomes')
        .select('*')
        .eq('user_id', state.userId)
        .order('created_at', { ascending: false })
        .limit(10)
    ]);

    const strategies = strategiesResult.data || [];
    const outcomes = outcomesResult.data || [];

    // Extract learnings from recent outcomes
    const learnings = outcomes.map(o => ({
      type: o.outcome_type,
      rating: o.user_rating,
      notes: o.user_notes
    }));

    const result = await executeOmegaPrompt<EvolverOutput>(
      OMEGA_PROMPTS.EVOLVE,
      {
        limits: (state.cognitiveIssues || []).map(l => ({
          type: l.limitType,
          description: l.description,
          severity: l.severity
        })),
        simulations: (state.simulations || []).map(s => ({
          hypothesis: s.hypothesis,
          outcomes: s.predictedOutcomes
        })),
        strategies: strategies.map(s => ({
          type: s.strategy_type,
          pattern: s.pattern,
          confidence: s.confidence,
          successCount: s.success_count,
          failureCount: s.failure_count
        })),
        learnings
      }
    );

    const durationMs = Date.now() - startTime;

    // Store proposed improvements
    const improvements: Improvement[] = [];
    for (const proposal of result.improvements) {
      const record = await supabase
        .from('pulse_improvements')
        .insert({
          user_id: state.userId,
          improvement_type: proposal.type,
          target_component: proposal.target,
          current_state: proposal.current_state,
          proposed_change: proposal.proposed_change,
          expected_impact: proposal.expected_impact,
          simulation_id: state.simulations?.[0]?.id,
          status: 'proposed'
        })
        .select()
        .single();

      if (record.data) {
        improvements.push({
          id: record.data.id,
          userId: state.userId,
          improvementType: proposal.type,
          targetComponent: proposal.target,
          currentState: proposal.current_state,
          proposedChange: proposal.proposed_change,
          expectedImpact: proposal.expected_impact,
          simulationId: state.simulations?.[0]?.id,
          status: 'proposed',
          createdAt: new Date().toISOString()
        });
      }
    }

    // Create reasoning step
    const step: ReasoningStep = {
      step: state.reasoningTrace.length + 1,
      action: 'evolve',
      input: {
        limitsCount: state.cognitiveIssues?.length || 0,
        strategiesCount: strategies.length
      },
      output: {
        improvementsProposed: improvements.length,
        priorityOrder: result.priority_order
      },
      reasoning: result.estimated_total_impact || `Proposed ${improvements.length} improvements`,
      durationMs
    };

    // Store trace
    await supabase.from('pulse_reasoning_traces').insert({
      user_id: state.userId,
      session_id: state.sessionId,
      trace_type: 'evolution',
      input_context: { cognitiveIssues: state.cognitiveIssues?.length },
      reasoning_steps: [step],
      output: { improvements: improvements.map(i => i.id) },
      duration_ms: durationMs,
      success: true
    });

    return {
      proposedImprovements: improvements,
      reasoningTrace: [...state.reasoningTrace, step]
    };
  } catch (error) {
    const durationMs = Date.now() - startTime;
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    const step: ReasoningStep = {
      step: state.reasoningTrace.length + 1,
      action: 'evolve',
      input: {},
      output: {},
      reasoning: `Failed: ${errorMessage}`,
      durationMs
    };

    return {
      proposedImprovements: [],
      reasoningTrace: [...state.reasoningTrace, step],
      error: errorMessage
    };
  }
}
