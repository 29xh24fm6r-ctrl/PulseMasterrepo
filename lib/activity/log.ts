import { supabaseAdmin } from "@/lib/supabase";

export type ActivityEventInput = {
    user_id?: string | null; // uuid string if available
    source: string;          // e.g. "capture", "email", "flush", "home"
    event_type: string;      // e.g. "capture.created"
    title: string;           // short UI label
    detail?: string | null;  // optional longer text
    payload?: Record<string, any>;
};

export async function logActivityEvent(e: ActivityEventInput) {
    // Best-effort logging: we never want logging to break the primary action.
    try {
        const { data, error } = await supabaseAdmin
            .from("activity_events")
            .insert({
                user_id: e.user_id ?? null,
                source: e.source ?? "system",
                event_type: e.event_type,
                title: e.title,
                detail: e.detail ?? null,
                payload: e.payload ?? {},
            })
            .select("id, created_at")
            .single();

        if (error) {
            console.warn("[activity_events] insert failed:", error.message);
            return;
        }

        // Auto-enqueue Momentum Ingest
        // (Fire & Forget to avoid slowing down main thread)
        if (data && e.user_id) {
            (async () => {
                try {
                    const { error: jobErr } = await supabaseAdmin.rpc("enqueue_job", {
                        p_job_type: "momentum_event_ingest",
                        p_payload: {
                            canon_event: {
                                id: data.id,
                                owner_user_id: e.user_id,
                                event_type: e.event_type,
                                payload: e.payload,
                                created_at: data.created_at,
                            }
                        }
                    });
                    if (jobErr) console.warn("[momentum] enqueue error:", jobErr.message);
                } catch (err: any) {
                    console.warn("[momentum] enqueue crashed:", err?.message);
                }
            })();
        }

    } catch (err: any) {
        console.warn("[activity_events] insert crashed:", err?.message ?? String(err));
    }
}
