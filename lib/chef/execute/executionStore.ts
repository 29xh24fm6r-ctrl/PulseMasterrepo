import { supabaseAdmin } from "@/lib/supabase/admin";

export async function getActiveExecution(args: { owner_user_id: string }) {
    const sb = supabaseAdmin();

    // Active = has no finished_at, most recent started_at
    const { data, error } = await sb
        .from("chef_cook_executions")
        .select("*")
        .eq("owner_user_id", args.owner_user_id)
        .is("finished_at", null)
        .order("started_at", { ascending: false })
        .limit(1);

    if (error) throw error;
    return data?.[0] ?? null;
}

export async function startExecution(args: {
    owner_user_id: string;
    cook_plan_id: string;
}) {
    const sb = supabaseAdmin();

    // Ensure plan is marked started
    const { error: planErr } = await sb
        .from("chef_cook_plans")
        .update({ status: "started" })
        .eq("id", args.cook_plan_id)
        .eq("owner_user_id", args.owner_user_id);

    if (planErr) throw planErr;

    const { data, error } = await sb
        .from("chef_cook_executions")
        .insert({
            owner_user_id: args.owner_user_id,
            cook_plan_id: args.cook_plan_id,
            current_step: 0,
            timers: [],
            state: {},
        })
        .select("*")
        .single();

    if (error) throw error;
    return data;
}

export async function updateExecution(args: {
    owner_user_id: string;
    execution_id: string;
    patch: Record<string, any>;
}) {
    const sb = supabaseAdmin();
    const { data, error } = await sb
        .from("chef_cook_executions")
        .update(args.patch)
        .eq("id", args.execution_id)
        .eq("owner_user_id", args.owner_user_id)
        .select("*")
        .single();

    if (error) throw error;
    return data;
}

export async function finishExecution(args: {
    owner_user_id: string;
    execution_id: string;
    cook_plan_id: string;
    status: "completed" | "cancelled";
}) {
    const sb = supabaseAdmin();
    const now = new Date().toISOString();

    const { error: execErr } = await sb
        .from("chef_cook_executions")
        .update({ finished_at: now })
        .eq("id", args.execution_id)
        .eq("owner_user_id", args.owner_user_id);

    if (execErr) throw execErr;

    const { error: planErr } = await sb
        .from("chef_cook_plans")
        .update({ status: args.status })
        .eq("id", args.cook_plan_id)
        .eq("owner_user_id", args.owner_user_id);

    if (planErr) throw planErr;

    return { finished_at: now };
}
