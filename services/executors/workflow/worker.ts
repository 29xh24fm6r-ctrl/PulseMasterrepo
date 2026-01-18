import { WorkflowPlan } from "@/lib/workflow/types";
import { v4 as uuidv4 } from "uuid";
import {
    lockNextRunnableWorkflow,
    updateWorkflowRun,
    findExecRun,
    createExecRun,
    emitWorkflowEvent,
    unlockWorkflowRun
} from "@/lib/runtime/workflow.runtime";

/**
 * Executes a single tick of the workflow worker.
 * 1. Locks a pending workflow run.
 * 2. Identifies current step.
 * 3. Checks status of current step (via child exec_runs).
 * 4. Advances or Fails.
 */
export async function tickWorkflowWorker() {
    // 1. Find and Lock ONE workflow run
    const run = await lockNextRunnableWorkflow();

    if (!run) {
        return { worked: false, reason: "No runnable workflows or lock failed" };
    }

    // 2. Load Plan
    const plan = run.plan_json as unknown as WorkflowPlan;
    const currentIndex = run.current_step_index;

    // Check completion
    if (currentIndex >= plan.steps.length) {
        await updateWorkflowRun(run.id, { status: "succeeded", locked_at: null });
        return { worked: true, action: "completed_workflow", runId: run.id };
    }

    const currentStep = plan.steps[currentIndex];

    // 3. Check for existing exec_run for this Step
    // We use idempotency key = `wf_{run_id}_step_{index}`
    const stepIdempotencyKey = `wf_${run.id}_step_${currentIndex}`;

    let existingExec;
    try {
        existingExec = await findExecRun(run.owner_user_id, stepIdempotencyKey);
    } catch (e) {
        await unlockWorkflowRun(run.id, "running");
        return { worked: false, reason: "DB error checking child exec" };
    }

    // CASE A: No child execution exists yet -> START IT

    // 3.1 Mobile Constraint Check
    const { checkMobileConstraints } = await import("@/lib/mobile/constraints");
    const mobileCheck = checkMobileConstraints(currentStep, run.context_json as any);

    if (!mobileCheck.allowed) {
        if (mobileCheck.action === 'suspend') {
            await updateWorkflowRun(run.id, {
                status: "paused",
                locked_at: null,
                error_json: { message: mobileCheck.reason, code: "MOBILE_SUSPENDED" }
            });

            await emitWorkflowEvent(run.parent_run_id!, run.owner_user_id, "WORKFLOW_PAUSED_MOBILE", {
                step_index: currentIndex,
                reason: mobileCheck.reason
            });

            return { worked: true, action: "suspended_mobile", reason: mobileCheck.reason };
        }
        // block/fail?
    }

    if (!existingExec) {
        // Create the execution run
        try {
            await createExecRun({
                owner_user_id: run.owner_user_id,
                parent_run_id: run.parent_run_id, // Link to global Pulse Run
                run_kind: currentStep.executor_kind,
                status: "queued",
                request_json: {
                    step_id: currentStep.step_id,
                    context: run.context_json,
                    workflow_id: run.id
                },
                idempotency_key: stepIdempotencyKey
            });
        } catch (e) {
            await unlockWorkflowRun(run.id, "running");
            return { worked: false, reason: "Failed to spawn step" };
        }

        // Emit event
        await emitWorkflowEvent(run.parent_run_id!, run.owner_user_id, "WORKFLOW_STEP_STARTED", {
            step_index: currentIndex,
            step_id: currentStep.step_id
        });

        await unlockWorkflowRun(run.id, "running"); // Unlock so next tick can check status
        return { worked: true, action: "started_step", step: currentStep.step_id };
    }

    // CASE B: Child execution exists -> CHECK STATUS
    const status = existingExec.status;

    if (status === 'succeeded') {
        // Step Done -> Advance
        const nextIndex = currentIndex + 1;

        await updateWorkflowRun(run.id, {
            current_step_index: nextIndex,
            // Optionally merge result into context?
            locked_at: null,
            status: nextIndex >= plan.steps.length ? "succeeded" : "running"
        });

        await emitWorkflowEvent(run.parent_run_id!, run.owner_user_id, "WORKFLOW_STEP_COMPLETED", {
            step_index: currentIndex,
            step_id: currentStep.step_id,
            result: existingExec.result_json
        });

        return { worked: true, action: "advanced_step", from: currentIndex, to: nextIndex };

    } else if (status === 'failed' || status === 'canceled') {
        // Step Failed -> Fail Workflow
        await updateWorkflowRun(run.id, {
            status: "failed",
            error_json: existingExec.error_json || { message: "Step failed" },
            locked_at: null
        });

        await emitWorkflowEvent(run.parent_run_id!, run.owner_user_id, "WORKFLOW_FAILED", {
            step_index: currentIndex,
            step_id: currentStep.step_id,
            reason: "Step execution failed"
        });

        return { worked: true, action: "failed_workflow", reason: status };
    } else {
        // Still running/queued
        // Just unlock and wait
        await unlockWorkflowRun(run.id, "waiting");
        return { worked: true, action: "waiting_for_step", status };
    }
}
