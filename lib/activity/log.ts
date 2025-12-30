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
        const { error } = await supabaseAdmin.from("activity_events").insert({
            user_id: e.user_id ?? null,
            source: e.source ?? "system",
            event_type: e.event_type,
            title: e.title,
            detail: e.detail ?? null,
            payload: e.payload ?? {},
        });

        if (error) {
            // swallow but keep a console breadcrumb for dev
            console.warn("[activity_events] insert failed:", error.message);
        }
    } catch (err: any) {
        console.warn("[activity_events] insert crashed:", err?.message ?? String(err));
    }
}
