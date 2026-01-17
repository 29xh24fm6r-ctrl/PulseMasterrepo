// Lazy init to prevent build crashes
import { createAdminClient } from "@/lib/supabase/server";

function getAdminClient() {
    return createAdminClient();
}

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
        const supabase = getAdminClient();
        const { data, error } = await supabase.rpc("log_activity", {
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
