import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

/**
 * Server-side only. Uses service role to guarantee writes
 * (so logging never fails due to RLS edge cases).
 */
const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
});

export type ActivityLogParams = {
    userId: string;
    eventName: string;
    eventTs?: string; // ISO
    source?: string; // api|middleware|system
    entityType?: string | null;
    entityId?: string | null;
    metadata?: Record<string, any>;
};

export async function logActivity(p: ActivityLogParams): Promise<string | null> {
    try {
        const { data, error } = await supabaseAdmin.rpc("log_activity", {
            p_user_id: p.userId,
            p_event_name: p.eventName,
            p_event_ts: p.eventTs ?? new Date().toISOString(),
            p_event_source: p.source ?? "api",
            p_entity_type: p.entityType ?? null,
            p_entity_id: p.entityId ?? null,
            p_metadata: p.metadata ?? {},
        });

        if (error) {
            // Never crash product flows because telemetry failed
            console.warn("[logActivity] rpc error", error);
            return null;
        }

        return data ?? null;
    } catch (e) {
        console.warn("[logActivity] exception", e);
        return null;
    }
}
