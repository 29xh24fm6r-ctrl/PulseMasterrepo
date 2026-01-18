
export type OutcomeSignalType = 'success' | 'failure' | 'interruption' | 'override';

export interface WorkflowOutcome {
    success: boolean;
    error?: string;
    interruptedByUser?: boolean;
    durationMs: number;
    expectedDurationMs?: number;
}

export interface LearningSuggestion {
    signal_type: OutcomeSignalType;
    confidence_delta: number;
    reasoning: string;
    tuning_suggestion?: string;
}

/**
 * Evaluates the outcome of a workflow execution and proposes learning adjustments.
 * This function allows Pulse to learn from past outcomes to improve potential calibration.
 * 
 * INVARIANT: Learning never bypasses gates. This output is ADVISORY ONLY.
 */
export function evaluateOutcome(outcome: WorkflowOutcome): LearningSuggestion {
    // CRITICAL: User interruption is the strongest negative signal for autonomy
    if (outcome.interruptedByUser) {
        return {
            signal_type: 'interruption',
            confidence_delta: -0.5,
            reasoning: 'User explicitly interrupted execution. Autonomy calibration likely too high or context mismatch.',
            tuning_suggestion: 'Downgrade autonomy level for this intent.'
        };
    }

    // Explicit failure or error
    if (!outcome.success || outcome.error) {
        return {
            signal_type: 'failure',
            confidence_delta: -0.2, // Penalize, but less than interruption (could be system error)
            reasoning: `Execution failed: ${outcome.error || 'Unknown error'}`,
            tuning_suggestion: 'Review error logs and retry with lower autonomy.'
        };
    }

    // Success case
    // Check for efficiency (e.g. taking way too long might be a soft negative)
    if (outcome.expectedDurationMs && outcome.durationMs > outcome.expectedDurationMs * 2) {
        return {
            signal_type: 'success',
            confidence_delta: 0.05, // Small positive, dampened by slowness
            reasoning: 'Success, but execution time exceeded prediction significantly.',
            tuning_suggestion: 'Optimize workflow steps.'
        };
    }

    return {
        signal_type: 'success',
        confidence_delta: 0.1,
        reasoning: 'Execution completed successfully within expected parameters.',
        tuning_suggestion: 'Consider increasing confidence threshold.'
    };
}
