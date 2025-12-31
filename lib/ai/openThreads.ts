import type { SupabaseClient } from "@supabase/supabase-js";

export type OpenThreadContext = {
    thread_id: string;
    thread_key: string;
    counterpart_email?: string | null;
    counterpart_name?: string | null;
    status: "open" | "closed" | "snoozed" | string;
    context: Record<string, any>;
    last_incoming_at?: string | null;
    last_outgoing_at?: string | null;
    last_nudge_at?: string | null;
};

export async function upsertOpenThread(opts: {
    supabaseAdmin: SupabaseClient;
    user_id_uuid: string;
    thread_key: string;
    counterpart_email?: string | null;
    counterpart_name?: string | null;
    contextPatch?: Record<string, any>;
    last_incoming_at?: string | null;
    last_outgoing_at?: string | null;
}): Promise<OpenThreadContext> {
    const { supabaseAdmin } = opts;

    const patchContext = opts.contextPatch ?? {};

    // Upsert by (user_id_uuid, thread_key)
    const { data, error } = await supabaseAdmin
        .from("open_threads")
        .upsert(
            [
                {
                    user_id_uuid: opts.user_id_uuid,
                    thread_key: opts.thread_key,
                    counterpart_email: opts.counterpart_email ?? null,
                    counterpart_name: opts.counterpart_name ?? null,
                    context: patchContext, // merged below if exists
                    last_incoming_at: opts.last_incoming_at ?? null,
                    last_outgoing_at: opts.last_outgoing_at ?? null,
                },
            ],
            { onConflict: "user_id_uuid,thread_key" }
        )
        .select("*")
        .single();

    if (error) throw error;

    // Merge context if thread existed (server doesn’t auto-merge jsonb in upsert)
    // We do a second update: context = context || patchContext
    if (Object.keys(patchContext).length > 0) {
        await supabaseAdmin
            .from("open_threads")
            .update({ context: (data.context ?? {}) as any })
            .eq("id", data.id);
        // NOTE: For true jsonb merge server-side you can add a SQL RPC later.
    }

    return {
        thread_id: data.id,
        thread_key: data.thread_key,
        counterpart_email: data.counterpart_email,
        counterpart_name: data.counterpart_name,
        status: data.status,
        context: data.context ?? {},
        last_incoming_at: data.last_incoming_at,
        last_outgoing_at: data.last_outgoing_at,
        last_nudge_at: data.last_nudge_at,
    };
}

export async function logThreadEvent(opts: {
    supabaseAdmin: SupabaseClient;
    user_id_uuid: string;
    thread_id: string;
    event_type: string;
    meta?: Record<string, any>;
}) {
    const { supabaseAdmin } = opts;
    await supabaseAdmin.from("open_thread_events").insert({
        user_id_uuid: opts.user_id_uuid,
        thread_id: opts.thread_id,
        event_type: opts.event_type,
        meta: opts.meta ?? {},
    });
}
