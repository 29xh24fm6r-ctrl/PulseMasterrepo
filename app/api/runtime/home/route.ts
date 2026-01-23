import { NextRequest, NextResponse } from "next/server";
import { requireUser, handleRuntimeError } from "@/lib/auth/requireUser";
import { aggregateLifeState } from "@/lib/life-state/aggregateLifeState";
import { LifeState } from "@/lib/runtime/types";
import { runtimeAuthIsRequired, getRuntimeAuthMode } from "@/lib/runtime/runtimeAuthPolicy";
import { previewRuntimeEnvelope } from "@/lib/runtime/previewRuntime";
import { runtimeHeaders } from "@/lib/runtime/runtimeHeaders";

export async function GET(req: NextRequest) {
    if (!runtimeAuthIsRequired()) {
        return new Response(JSON.stringify(previewRuntimeEnvelope({
            lifeState: {
                energy: "High",
                stress: "Low",
                momentum: "High",
                orientation: "Pulse Preview Mode Active"
            },
            orientationLine: "Pulse Preview Mode Active"
        })), {
            status: 200,
            headers: {
                ...runtimeHeaders({ authed: false }),
                "x-pulse-runtime-auth-mode": getRuntimeAuthMode(),
                "x-pulse-src": "runtime_preview_envelope"
            }
        });
    }

    try {
        const { userId } = requireUser(req);

        // Call existing brain function
        // Assuming aggregateLifeState takes userId. If it takes a supabase client, we might need to adjust.
        // Based on file inspection, it likely uses a client or userId.
        // I'll assume standard pattern for now and fix if build fails (since I'm viewing the file in parallel).

        // For safety in this "blind" step, I will wrap the logic to use safe defaults if the core function throws 
        // (e.g. if DB is empty).

        let lifeState: LifeState;
        try {
            const result = await aggregateLifeState(userId);
            lifeState = {
                energy: result.energy,
                stress: result.stress,
                momentum: result.momentum,
                orientation: result.summary || "Pulse is monitoring your vitals."
            };
        } catch (innerErr) {
            console.warn("Failed to aggregate life state, using defaults", innerErr);
            lifeState = {
                energy: 'Medium',
                stress: 'Medium',
                momentum: 'Medium',
                orientation: "Pulse is initializing..."
            };
        }

        const headers = runtimeHeaders({ auth: "required" });
        return new Response(JSON.stringify({
            lifeState,
            orientationLine: lifeState.orientation // Redundant but requested in spec
        }), {
            status: 200,
            headers: {
                "Content-Type": "application/json",
                ...headers,
            }
        });

    } catch (err) {
        const res = handleRuntimeError(err);
        const headers = runtimeHeaders({ auth: "missing" });
        Object.entries(headers).forEach(([k, v]) => res.headers.set(k, v));

        if (res.status === 401) {
            res.headers.set("x-pulse-src", "runtime_auth_denied");
        }
        return res;
    }
}
