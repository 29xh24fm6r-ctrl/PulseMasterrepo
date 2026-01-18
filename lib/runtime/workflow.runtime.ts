
import { createClient } from "@supabase/supabase-js";
import { WorkflowPlan } from "@/lib/workflow/types";

// Service Role Client (for Worker)
// We instantiate this here (Runtime Enclave) which is allowed to use the SDK.
const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * Finds and locks a single runnable workflow.
 */
export async function lockNextRunnableWorkflow() {
    const now = new Date();
    const staleTime = new Date(now.getTime() - 60000); // 1 minute ago

    // 1. Find
    const { data: run, error: fetchError } = await supabase
        .from("workflow_runs")
        .select("*")
        .in("status", ["queued", "running", "waiting"])
        .or(`locked_at.is.null,locked_at.lt.${staleTime.toISOString()}`)
        .limit(1)
        .single();

    if (fetchError || !run) {
        return null;
    }

    // 2. Lock
    const { error: lockError } = await supabase
        .from("workflow_runs")
        .update({
            locked_at: new Date().toISOString(),
            locked_by: "worker_v1",
            status: "running" // Ensure it's marked running
        })
        .eq("id", run.id);

    if (lockError) {
        return null;
    }

    return run;
}

/**
 * Updates a workflow run.
 */
export async function updateWorkflowRun(runId: string, updates: any) {
    const { error } = await supabase
        .from("workflow_runs")
        .update(updates)
        .eq("id", runId);

    if (error) {
        console.error("Failed to update workflow run", error);
        throw error;
    }
}

/**
 * Checks for existing execution run for a step.
 */
export async function findExecRun(ownerUserId: string, idempotencyKey: string) {
    const { data, error } = await supabase
        .from("exec_runs")
        .select("status, result_json, error_json")
        .eq("owner_user_id", ownerUserId)
        .eq("idempotency_key", idempotencyKey)
        .single();

    if (error && error.code !== 'PGRST116') {
        throw error;
    }
    return data;
}

/**
 * Creates a new execution run.
 */
export async function createExecRun(data: any) {
    const { error } = await supabase
        .from("exec_runs")
        .insert(data);

    if (error) {
        console.error("Failed to spawn exec_run", error);
        throw error;
    }
}

/**
 * Emits a Pulse Run Event.
 */
export async function emitWorkflowEvent(runKind: string, ownerId: string, type: string, payload: any) {
    if (!runKind) return; // runKind here is parent_run_id which might be null? worker check said `run.parent_run_id!`
    // The original code was `emitEvent(run.parent_run_id!, ...)`

    const { error } = await supabase.from("pulse_run_events").insert({
        run_id: runKind, // Mapping runId argument
        owner_user_id: ownerId,
        event_type: type,
        payload
    });

    if (error) {
        console.error("Failed to emit event", error);
    }
}

/**
 * Unlocks a workflow run (e.g. on error or wait).
 */
export async function unlockWorkflowRun(runId: string, status: string) {
    await supabase.from("workflow_runs").update({ locked_at: null, status }).eq("id", runId);
}
