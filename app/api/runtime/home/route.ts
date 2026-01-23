import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/requireUser";
import { aggregateLifeState } from "@/lib/life-state/aggregateLifeState";
import { LifeState } from "@/lib/runtime/types";
import { runtimeAuthIsRequired, getRuntimeAuthMode } from "@/lib/runtime/runtimeAuthPolicy";
import { previewRuntimeEnvelope } from "@/lib/runtime/previewRuntime";
import { runtimeHeaders } from "@/lib/runtime/runtimeHeaders";

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

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

        const customHeaders = runtimeHeaders({ auth: "bypassed" });
        const response = NextResponse.json(body);
        response.headers.delete('cache-control');
        response.headers.delete('pragma');
        response.headers.delete('expires');
        for (const [key, value] of Object.entries(customHeaders)) {
            response.headers.set(key, value);
        }
        // Restore diagnostic headers for preview if needed, manually
        response.headers.set("x-pulse-runtime-auth-mode", getRuntimeAuthMode());
        response.headers.set("x-pulse-src", "runtime_preview_envelope");
        return response;
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

        const customHeaders = runtimeHeaders({ auth: "required" });
        const response = NextResponse.json({
            lifeState,
            orientationLine: lifeState.orientation
        });
        response.headers.delete('cache-control');
        response.headers.delete('pragma');
        response.headers.delete('expires');
        for (const [key, value] of Object.entries(customHeaders)) {
            response.headers.set(key, value);
        }
        return response;

    } catch (err: any) {
        console.error("[Runtime] Error:", err);
        const status = err.status || 500;
        const msg = err.message || "Internal Error";

        // Auth check specific
        const isAuthErr = status === 401 || err.code === 'AUTH_MISSING';

        const customHeaders = runtimeHeaders({ auth: isAuthErr ? "missing" : "required" });
        const response = NextResponse.json({ error: msg }, { status });

        response.headers.delete('cache-control');
        response.headers.delete('pragma');
        response.headers.delete('expires');
        for (const [key, value] of Object.entries(customHeaders)) {
            response.headers.set(key, value);
        }
        response.headers.set("x-pulse-src", "runtime_error_boundary");
        return response;
    }
}
