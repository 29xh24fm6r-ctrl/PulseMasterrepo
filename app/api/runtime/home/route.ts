import { NextRequest } from "next/server";
import { requireUser } from "@/lib/auth/requireUser";
import { aggregateLifeState } from "@/lib/life-state/aggregateLifeState";
import { LifeState } from "@/lib/runtime/types";
import { runtimeAuthIsRequired, getRuntimeAuthMode } from "@/lib/runtime/runtimeAuthPolicy";
import { previewRuntimeEnvelope } from "@/lib/runtime/previewRuntime";
import { runtimeHeaders } from "@/lib/runtime/runtimeHeaders";

export async function GET(req: NextRequest) {
    if (!runtimeAuthIsRequired()) {
        const body = previewRuntimeEnvelope({
            lifeState: {
                energy: "High",
                stress: "Low",
                momentum: "High",
                orientation: "Pulse Preview Mode Active"
            },
            orientationLine: "Pulse Preview Mode Active"
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

    } catch (err: any) {
        // SAFE ERROR HANDLING (No NextResponse)
        console.error("[Runtime] Error:", err);
        const status = err.status || 500;
        const msg = err.message || "Internal Error";

        // Auth check specific
        const isAuthErr = status === 401 || err.code === 'AUTH_MISSING';

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
