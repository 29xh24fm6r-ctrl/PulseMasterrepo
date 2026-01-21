import { NextRequest, NextResponse } from "next/server";
import { requireUser, handleRuntimeError } from "@/lib/auth/requireUser";
import { getSupabaseAdminRuntimeClient } from "@/lib/runtime/supabase.runtime";
import { ObserverData } from "@/lib/runtime/types";
import { resolveSubscription } from "@/lib/subscription/resolveSubscription";
import { isPreviewRuntime } from "@/lib/runtime/env";

export async function GET(req: NextRequest) {
    if (isPreviewRuntime()) {
        return NextResponse.json({
            runtime: [],
            autonomy: [],
            effects: [],
            ipp: [],
            background: []
        });
    }

    try {
        const { userId } = requireUser(req);

        const [db, sub] = await Promise.all([
            Promise.resolve(getSupabaseAdminRuntimeClient()),
            resolveSubscription(userId)
        ]);

        // Parallel fetch from ledgers
        // We might not have all 5 tables fully active or wired in schema yet.
        // I will check specific tables:
        // - pulse_runtime_events (Runtime)
        // - pulse_autonomy_log (Autonomy)
        // - pulse_effects (Effects)
        // - pulse_ipp_events (IPP)
        // - pulse_background_jobs (Background)
        // If table doesn't exist, we return empty array (safe default for read-only).

        // Using Promise.allSettled to avoid one missing table killing the whole dashboard
        const [
            runtimeRes,
            autonomyRes,
            effectsRes,
            ippRes,
            bgRes
        ] = await Promise.allSettled([
            db.from('pulse_runtime_events').select('*').limit(10).order('created_at', { ascending: false }),
            db.from('pulse_autonomy_log').select('*').limit(10).order('created_at', { ascending: false }),
            db.from('pulse_effects').select('*').limit(10).order('created_at', { ascending: false }),
            db.from('pulse_ipp_events').select('*').limit(10).order('created_at', { ascending: false }),
            db.from('pulse_background_jobs').select('*').limit(10).order('created_at', { ascending: false })
        ]);

        const runtime = extractData(runtimeRes) || [];
        const autonomy = extractData(autonomyRes) || [];
        const effects = extractData(effectsRes) || [];
        const ipp = extractData(ippRes) || [];
        const background = extractData(bgRes) || [];

        // TRUNCATION Enforcement
        const isFree = !sub.capabilities.observerFull;
        const limit = isFree ? 3 : 10;

        const data: ObserverData = {
            runtime: runtime.slice(0, limit).map((r: any) => ({
                id: r.id,
                timestamp: r.created_at,
                type: r.type || 'tick',
                summary: r.summary || 'Event',
                detail: r.detail
            })),
            autonomy: autonomy.slice(0, limit).map((r: any) => ({
                id: r.id,
                domain: r.domain,
                action: r.action,
                eligibility: r.eligibility,
                confidence: r.confidence,
                drift: r.drift,
                explainable: r.explainable
            })),
            effects: effects.slice(0, limit).map((r: any) => ({
                id: r.id,
                timestamp: r.created_at,
                domain: r.domain,
                action: r.action,
                status: r.status,
                source: r.source || 'pulse',
                explainable: r.explainable
            })),
            ipp: ipp.slice(0, limit).map((r: any) => ({
                id: r.id,
                timestamp: r.created_at,
                blocker: r.blocker,
                message: r.message,
                resolved: r.resolved
            })),
            background: background.slice(0, limit).map((r: any) => ({
                id: r.id,
                timestamp: r.created_at,
                job: r.job_name || r.job,
                status: r.status,
                note: r.result || r.note
            }))
        };

        return NextResponse.json(data);

    } catch (err) {
        return handleRuntimeError(err);
    }
}

function extractData(res: PromiseSettledResult<any>) {
    if (res.status === 'fulfilled' && !res.value.error) {
        return res.value.data;
    }
    return [];
}
