
import { WorkflowContext, WorkflowStep } from "../workflow/types";

export const MobileCapabilities = {
    voice_capture: true,
    always_on_mic: false,
    background_execution: false, // Generally false for robust assumptions
    push_triggered: 'user_action_required',
};

export interface MobileConstraintCheck {
    allowed: boolean;
    reason?: string;
    action?: 'suspend' | 'block';
}

/**
 * Checks if a step is allowed to run given the current execution context.
 * If the context defines 'client_platform' as 'ios' or 'android',
 * strict mobile constraints are enforced.
 */
export function checkMobileConstraints(step: WorkflowStep, context: WorkflowContext): MobileConstraintCheck {
    const platform = context?.client_platform as string | undefined;

    // If not mobile, everything allowed (server context assumed safe or managed otherwise)
    if (platform !== 'ios' && platform !== 'android') {
        return { allowed: true };
    }

    // If mobile allowed explicitly
    if (step.mobile_allowed) {
        return { allowed: true };
    }

    // If mobile NOT allowed
    return {
        allowed: false,
        reason: "Step not allowed on mobile platform",
        action: "suspend"
    };
}
