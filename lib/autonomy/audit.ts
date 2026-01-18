import { getSupabaseAdmin } from "@/lib/supabase/admin";

export async function emitAutonomyEvent(args: {
    run_id: string; // associate with a run
    event_type: 'AUTONOMY_GRANTED' | 'AUTONOMY_USED' | 'AUTONOMY_REVOKED';
    detail: any;
}) {
    const supabase = getSupabaseAdmin();
    // Assuming we use pulse_run_events or exec_steps. 
    // Let's use pulse_run_events for high visibility in Companion
    await supabase.from("pulse_run_events").insert({
        run_id: args.run_id,
        event_name: args.event_type,
        event_data: args.detail
    });
}
