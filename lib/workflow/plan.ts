
import { WorkflowPlan } from "./types";

/**
 * Validates a workflow plan against Phase 10 Canon invariants.
 * 
 * Invariants:
 * 1. Steps must be non-empty.
 * 2. Mobile-disallowed steps cannot be in a plan marked for mobile execution (runtime check).
 * 3. Deep step validation.
 */
export function validateWorkflowPlan(plan: WorkflowPlan): { valid: boolean; error?: string } {
    if (!plan.workflow_id) return { valid: false, error: "Missing workflow_id" };
    if (!plan.steps || plan.steps.length === 0) return { valid: false, error: "Workflow must have at least one step" };

    // Validate each step
    for (let i = 0; i < plan.steps.length; i++) {
        const step = plan.steps[i];
        if (!step.step_id) return { valid: false, error: `Step ${i} missing step_id` };
        if (!step.executor_kind) return { valid: false, error: `Step ${i} missing executor_kind` };
        if (!step.risk) return { valid: false, error: `Step ${i} missing risk class` };
        if (typeof step.mobile_allowed === 'undefined') return { valid: false, error: `Step ${i} must declare mobile_allowed explicit status` };
    }

    return { valid: true };
}

/**
 * Calculates a deterministic hash for a workflow plan to ensure immutability.
 * (Simple stringify for now, can upgrade to SHA-256 if needed).
 */
export function hashWorkflowPlan(plan: WorkflowPlan): string {
    return JSON.stringify(plan);
}
