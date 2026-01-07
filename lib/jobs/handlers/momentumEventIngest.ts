import { supabaseAdmin } from "@/lib/supabase/admin";
import { mapCanonToMomentum } from "@/lib/momentum/mapCanonToMomentum";
import { CanonEvent } from "@/lib/momentum/types";
import { JobHandler } from "./types";

export const momentumEventIngest: JobHandler<"momentum_event_ingest"> = async ({ job_id, payload, ctx }) => {
    const { canon_event } = payload as { canon_event: CanonEvent };

    if (!canon_event) {
        throw new Error(`momentumEventIngest: missing canon_event in payload (job: ${job_id})`);
    }

    const signals = mapCanonToMomentum(canon_event);

    for (const signal of signals) {
        // We use ctx.supabaseAdmin if available or global one, but handler type usually implies we just use ctx or import.
        // The spec used supabaseAdmin directly.
        // We'll use the one from ctx if we want consistency, but sticking to spec pattern for simplicity.
        const sb = ctx.supabaseAdmin || supabaseAdmin;

        const { error } = await sb.rpc("momentum_event_ingest", {
            p_owner_user_id: canon_event.owner_user_id,
            p_domain_slug: signal.domain_slug,
            p_signal_type: signal.signal_type,
            p_weight: signal.weight,
            p_source_event_id: canon_event.id,
        });

        if (error) {
            ctx.logger.error("Failed to ingest momentum signal", { error, signal });
            // Should we throw? If one signal fails, maybe we don't want to fail the whole job?
            // "Unknown events -> ignored, never error." - but this is an RPC failure for a VALID signal.
            // We should probably throw to retry.
            throw new Error(`RPC momentum_event_ingest failed: ${error.message}`);
        }
    }

    return { ok: true, output: { ingested_signals: signals.length } };
};
