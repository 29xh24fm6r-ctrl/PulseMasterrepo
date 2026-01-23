import { NextRequest } from "next/server";
import { requireUser } from "@/lib/auth/requireUser";
import { getSupabaseAdminRuntimeClient } from "@/lib/runtime/supabase.runtime";
import { ObserverData } from "@/lib/runtime/types";
import { resolveSubscription } from "@/lib/subscription/resolveSubscription";
import { runtimeAuthIsRequired, getRuntimeAuthMode } from "@/lib/runtime/runtimeAuthPolicy";
import { previewRuntimeEnvelope } from "@/lib/runtime/previewRuntime";
import { runtimeHeaders } from "@/lib/runtime/runtimeHeaders";

export async function GET(req: NextRequest) {
    if (!runtimeAuthIsRequired()) {
        const body = previewRuntimeEnvelope({
            events: [],
            autonomy: [],
            effects: [],
            ipp: null,
            background: []
        });
        return new Response(JSON.stringify(body), {
            status: 200,
            headers: {
                "Content-Type": "application/json",
                ...runtimeHeaders({ auth: "bypassed" }),
                "x-pulse-runtime-auth-mode": getRuntimeAuthMode(),
                "x-pulse-src": "runtime_preview_envelope"
            }
        });
    }

    try {
        const { userId } = requireUser(req);

        const [db, sub] = await Promise.all([
            Promise.resolve(getSupabaseAdminRuntimeClient()),
            resolveSubscription(userId)
        ]);

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

        const headers = runtimeHeaders({ auth: "required" });
        return new Response(JSON.stringify(data), {
            status: 200,
            headers: {
                "Content-Type": "application/json",
                ...headers,
            }
        });

    } catch (err: any) {
        console.error("[Runtime] Error:", err);
        const status = err.status || 500;
        const msg = err.message || "Internal Error";
        const isAuthErr = status === 401;

        return new Response(JSON.stringify({ error: msg }), {
            status,
            headers: {
                "Content-Type": "application/json",
                ...runtimeHeaders({ auth: isAuthErr ? "missing" : "required" }),
                "x-pulse-src": "runtime_error_boundary"
            }
        });
    }
}

function extractData(res: PromiseSettledResult<any>) {
    if (res.status === 'fulfilled' && !res.value.error) {
        return res.value.data;
    }
    return [];
}
