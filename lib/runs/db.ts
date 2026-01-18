// lib/runs/db.ts
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import type { RunKind, RunStatus } from "@/lib/runs/types";

export async function createRun(args: {
    owner_user_id: string;
    kind: RunKind;
    key: string;
    status: RunStatus;
    input?: any;
    client_context?: any;
    privacy?: any;
}) {
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
        .from("pulse_runs")
        .insert({
            owner_user_id: args.owner_user_id,
            kind: args.kind,
            key: args.key,
            status: args.status,
            input: args.input ?? {},
            client_context: args.client_context ?? {},
            privacy: args.privacy ?? {},
        })
        .select("id")
        .single();

    if (error) throw error;
    return data.id as string;
}

export async function setRunStatus(args: {
    run_id: string;
    owner_user_id: string;
    status: RunStatus;
    output?: any;
    error?: any;
}) {
    const supabase = getSupabaseAdmin();
    const patch: any = {
        status: args.status,
    };

    if (args.status === "succeeded" || args.status === "failed" || args.status === "canceled") {
        patch.finished_at = new Date().toISOString();
    }

    if (args.output) patch.output = args.output;
    if (args.error) patch.error = args.error;

    const { error } = await supabase
        .from("pulse_runs")
        .update(patch)
        .eq("id", args.run_id)
        .eq("owner_user_id", args.owner_user_id);

    if (error) throw error;
}

export async function insertEvent(args: {
    run_id: string;
    owner_user_id: string;
    event_type: string;
    payload?: any;
}) {
    const supabase = getSupabaseAdmin();
    const { error } = await supabase.from("pulse_run_events").insert({
        run_id: args.run_id,
        owner_user_id: args.owner_user_id,
        event_type: args.event_type,
        payload: args.payload ?? {},
    });

    if (error) throw error;
}

export async function fetchEventsAfter(args: { run_id: string; after_seq: number }) {
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
        .from("pulse_run_events")
        .select("seq,event_type,payload,created_at")
        .eq("run_id", args.run_id)
        .gt("seq", args.after_seq)
        .order("seq", { ascending: true })
        .limit(200);

    if (error) throw error;
    return data ?? [];
}

export async function fetchRunStatus(args: { run_id: string }) {
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
        .from("pulse_runs")
        .select("status,finished_at")
        .eq("id", args.run_id)
        .single();

    if (error) throw error;
    return data as { status: RunStatus; finished_at: string | null };
}
