import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { sanitize } from "./sanitize";
import { createHash } from "crypto";

export async function createExecution(args: {
    owner_user_id: string;
    run_kind: string;
    request: any;
    idempotency_key?: string;
}) {
    const supabase = getSupabaseAdmin();

    const request_json = sanitize(args.request);
    // Generate determinstic key if not provided
    const key = args.idempotency_key || createHash("sha256").update(args.owner_user_id + args.run_kind + JSON.stringify(request_json)).digest("hex");

    // Check existing
    const { data: existing } = await supabase
        .from("exec_runs")
        .select("id, status")
        .eq("owner_user_id", args.owner_user_id)
        .eq("idempotency_key", key)
        .single();

    if (existing) {
        return { run_id: existing.id, status: existing.status, is_new: false };
    }

    // Create new
    const { data: created, error } = await supabase
        .from("exec_runs")
        .insert({
            owner_user_id: args.owner_user_id,
            run_kind: args.run_kind,
            request_json,
            idempotency_key: key,
            status: "queued"
        })
        .select("id")
        .single();

    if (error) throw error;

    return { run_id: created.id, status: "queued", is_new: true };
}

export async function enqueueJob(args: {
    run_id: string;
    job_kind: string;
    payload: any;
}) {
    const supabase = getSupabaseAdmin();
    // Unique job key per run/kind
    const idempotency_key = `job_${args.run_id}_${args.job_kind}`;

    await supabase.from("exec_outbox").upsert({
        run_id: args.run_id,
        job_kind: args.job_kind,
        payload_json: sanitize(args.payload),
        idempotency_key,
        status: "ready"
    }, { onConflict: "idempotency_key" }); // Safe upsert
}

export async function logStep(run_id: string, event_name: string, detail?: any) {
    const supabase = getSupabaseAdmin();
    await supabase.from("exec_steps").insert({
        run_id,
        event_name,
        detail_json: sanitize(detail)
    });
}
