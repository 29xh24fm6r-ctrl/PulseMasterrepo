// lib/omega/nodes/diagnoser.ts
// Diagnoser: Identify cognitive limits and weaknesses

import { executeOmegaPrompt } from "../llm";
import { OMEGA_PROMPTS } from "../prompts";
import type { OmegaState, CognitiveLimit, ReasoningStep, CognitiveLimitType, Severity } from "../types";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

interface DiagnoserOutput {
  cognitive_limits: {
    type: CognitiveLimitType;
    description: string;
    severity: Severity;
    evidence: string;
    impact: string;
    suggested_remedy: string;
  }[];
  patterns_we_miss?: string[];
  calibration_issues?: string;
  priority_fixes?: string[];
}

export async function diagnose(state: OmegaState): Promise<Partial<OmegaState>> {
  const startTime = Date.now();

  try {
    const supabase = getSupabaseAdmin();

    // Fetch recent traces and failures
    const [tracesResult, failuresResult, existingLimitsResult] = await Promise.all([
      supabase
        .from('pulse_reasoning_traces')
        .select('*')
        .eq('user_id', state.userId)
        .order('created_at', { ascending: false })
        .limit(20),
      supabase
        .from('pulse_outcomes')
        .select('*, draft:pulse_drafts(*)')
        .eq('user_id', state.userId)
        .eq('outcome_type', 'failure')
        .order('created_at', { ascending: false })
        .limit(10),
      supabase
        .from('pulse_cognitive_limits')
        .select('*')
        .eq('user_id', state.userId)
        .eq('addressed', false)
        .limit(10)
    ]);

    const traces = tracesResult.data || [];
    const failures = failuresResult.data || [];
    const existingLimits = existingLimitsResult.data || [];

    const result = await executeOmegaPrompt<DiagnoserOutput>(
      OMEGA_PROMPTS.DIAGNOSE,
      {
        traces: traces.map(t => ({
          type: t.trace_type,
          success: t.success,
          failureReason: t.failure_reason,
          output: t.output
        })),
        failures: failures.map(f => ({
          outcome: f.outcome_type,
          notes: f.user_notes,
          rating: f.user_rating,
          draft: f.draft
        })),
        observations: state.observations || [],
        existingLimits: existingLimits.map(l => ({
          type: l.limit_type,
          description: l.description,
          severity: l.severity
        }))
      }
    );

    const durationMs = Date.now() - startTime;

    // Store new cognitive limits
    const newLimits: CognitiveLimit[] = [];
    for (const limit of result.cognitive_limits) {
      const record = await supabase
        .from('pulse_cognitive_limits')
        .insert({
          user_id: state.userId,
          limit_type: limit.type,
          description: limit.description,
          evidence: { raw: limit.evidence, impact: limit.impact },
          severity: limit.severity,
          addressed: false
        })
        .select()
        .single();

      if (record.data) {
        newLimits.push({
          id: record.data.id,
          userId: state.userId,
          limitType: limit.type,
          description: limit.description,
          evidence: { raw: limit.evidence, impact: limit.impact },
          severity: limit.severity,
          addressed: false,
          discoveredAt: new Date().toISOString()
        });
      }
    }

    // Create reasoning step
    const step: ReasoningStep = {
      step: state.reasoningTrace.length + 1,
      action: 'diagnose',
      input: { tracesCount: traces.length, failuresCount: failures.length },
      output: { limitsFound: result.cognitive_limits.length, priorityFixes: result.priority_fixes },
      reasoning: result.calibration_issues || 'Diagnosis complete',
      durationMs
    };

    // Store trace
    await supabase.from('pulse_reasoning_traces').insert({
      user_id: state.userId,
      session_id: state.sessionId,
      trace_type: 'diagnosis',
      input_context: { tracesCount: traces.length, failuresCount: failures.length },
      reasoning_steps: [step],
      output: result,
      duration_ms: durationMs,
      success: true
    });

    return {
      cognitiveIssues: newLimits,
      reasoningTrace: [...state.reasoningTrace, step]
    };
  } catch (error) {
    const durationMs = Date.now() - startTime;
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    const step: ReasoningStep = {
      step: state.reasoningTrace.length + 1,
      action: 'diagnose',
      input: {},
      output: {},
      reasoning: `Failed: ${errorMessage}`,
      durationMs
    };

    return {
      cognitiveIssues: [],
      reasoningTrace: [...state.reasoningTrace, step],
      error: errorMessage
    };
  }
}
