
import { createClient } from "@supabase/supabase-js";
import { WorkflowPlan } from "@/lib/workflow/types";
import { v4 as uuidv4 } from "uuid";

// Service Role Client (for Worker)
const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * Executes a single tick of the workflow worker.
 * 1. Locks a pending workflow run.
 * 2. Identifies current step.
 * 3. Checks status of current step (via child exec_runs).
 * 4. Advances or Fails.
 */
export async function tickWorkflowWorker() {
    // 1. Find and Lock ONE workflow run
    // Status: queued, running, waiting
    // Not locked recently (stale lock > 1 min)
    const now = new Date();
    const staleTime = new Date(now.getTime() - 60000); // 1 minute ago

    const { data: run, error: fetchError } = await supabase
        .from("workflow_runs")
        .select("*")
        .in("status", ["queued", "running", "waiting"])
        .or(`locked_at.is.null,locked_at.lt.${staleTime.toISOString()}`)
        .limit(1)
        .single();

    if (fetchError || !run) {
        return { worked: false, reason: "No runnable workflows" };
    }

    // Lock it
    const { error: lockError } = await supabase
        .from("workflow_runs")
        .update({
            locked_at: new Date().toISOString(),
            locked_by: "worker_v1",
            status: "running" // Ensure it's marked running if it was queued
        })
        .eq("id", run.id);

    if (lockError) {
        return { worked: false, reason: "Failed to lock" };
    }

    // 2. Load Plan
    const plan = run.plan_json as unknown as WorkflowPlan;
    const currentIndex = run.current_step_index;

    // Check completion
    if (currentIndex >= plan.steps.length) {
        await supabase
            .from("workflow_runs")
            .update({ status: "succeeded", locked_at: null })
            .eq("id", run.id);
        return { worked: true, action: "completed_workflow", runId: run.id };
    }

    const currentStep = plan.steps[currentIndex];

    // 3. Check for existing exec_run for this Step
    // We use idempotency key = `wf_{run_id}_step_{index}`
    const stepIdempotencyKey = `wf_${run.id}_step_${currentIndex}`;

    const { data: existingExec, error: execError } = await supabase
        .from("exec_runs")
        .select("status, result_json, error_json")
        .eq("owner_user_id", run.owner_user_id)
        .eq("idempotency_key", stepIdempotencyKey)
        .single();

    if (execError && execError.code !== 'PGRST116') {
        // Real error
        await unlock(run.id, "running"); // Keep running, retry next tick
        return { worked: false, reason: "DB error checking child exec" };
    }

    // CASE A: No child execution exists yet -> START IT

    // 3.1 Mobile Constraint Check
    const { checkMobileConstraints } = await import("@/lib/mobile/constraints");
    const mobileCheck = checkMobileConstraints(currentStep, run.context_json as any);

    if (!mobileCheck.allowed) {
        if (mobileCheck.action === 'suspend') {
            await supabase
                .from("workflow_runs")
                .update({
                    status: "paused",
                    locked_at: null,
                    error_json: { message: mobileCheck.reason, code: "MOBILE_SUSPENDED" }
                })
                .eq("id", run.id);

            await emitEvent(run.parent_run_id!, run.owner_user_id, "WORKFLOW_PAUSED_MOBILE", {
                step_index: currentIndex,
                reason: mobileCheck.reason
            });

            return { worked: true, action: "suspended_mobile", reason: mobileCheck.reason };
        }
        // block/fail?
    }

    if (!existingExec) {
        // Create the execution run
        const { error: insertError } = await supabase
            .from("exec_runs")
            .insert({
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

        if (insertError) {
            console.error("Failed to spawn exec_run", insertError);
            // If we can't spawn, we fail the workflow? Or retry?
            // Retry for now.
            await unlock(run.id, "running");
            return { worked: false, reason: "Failed to spawn step" };
        }

        // Emit event
        await emitEvent(run.parent_run_id!, run.owner_user_id, "WORKFLOW_STEP_STARTED", {
            step_index: currentIndex,
            step_id: currentStep.step_id
        });

        await unlock(run.id, "running"); // Unlock so next tick can check status
        return { worked: true, action: "started_step", step: currentStep.step_id };
    }

    // CASE B: Child execution exists -> CHECK STATUS
    const status = existingExec.status;

    if (status === 'succeeded') {
        // Step Done -> Advance
        const nextIndex = currentIndex + 1;

        await supabase
            .from("workflow_runs")
            .update({
                current_step_index: nextIndex,
                // Optionally merge result into context?
                locked_at: null,
                status: nextIndex >= plan.steps.length ? "succeeded" : "running"
            })
            .eq("id", run.id);

        await emitEvent(run.parent_run_id!, run.owner_user_id, "WORKFLOW_STEP_COMPLETED", {
            step_index: currentIndex,
            step_id: currentStep.step_id,
            result: existingExec.result_json
        });

        return { worked: true, action: "advanced_step", from: currentIndex, to: nextIndex };

    } else if (status === 'failed' || status === 'canceled') {
        // Step Failed -> Fail Workflow
        await supabase
            .from("workflow_runs")
            .update({
                status: "failed",
                error_json: existingExec.error_json || { message: "Step failed" },
                locked_at: null
            })
            .eq("id", run.id);

        await emitEvent(run.parent_run_id!, run.owner_user_id, "WORKFLOW_FAILED", {
            step_index: currentIndex,
            step_id: currentStep.step_id,
            reason: "Step execution failed"
        });

        return { worked: true, action: "failed_workflow", reason: status };
    } else {
        // Still running/queued
        // Just unlock and wait
        await unlock(run.id, "waiting");
        return { worked: true, action: "waiting_for_step", status };
    }
}

async function unlock(runId: string, status: string) {
    await supabase.from("workflow_runs").update({ locked_at: null, status }).eq("id", runId);
}

async function emitEvent(runId: string, ownerId: string, type: string, payload: any) {
    if (!runId) return;
    await supabase.from("pulse_run_events").insert({
        run_id: runId,
        owner_user_id: ownerId,
        event_type: type,
        payload
    });
}
