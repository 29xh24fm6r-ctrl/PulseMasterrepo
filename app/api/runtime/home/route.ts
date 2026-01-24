import { NextRequest, NextResponse } from "next/server";
import { requireUserId } from "@/lib/runtime/requireUserId";
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

        // Create response first
        const response = NextResponse.json(body, { status: 200 });

        // Restore diagnostic headers for preview if needed
        const headers: any = { ...customHeaders };
        headers["x-pulse-runtime-auth-mode"] = getRuntimeAuthMode();
        headers["x-pulse-src"] = "runtime_preview_envelope";

        Object.entries(headers).forEach(([key, value]) => {
            response.headers.set(key, value as string);
        });

        return response;
    }

    try {
        const userId = await requireUserId(req);
        if (!userId) {
            const customHeaders = runtimeHeaders({ auth: "missing" });
            const response = NextResponse.json({ error: "User identity missing" }, { status: 401 });
            Object.entries(customHeaders).forEach(([key, value]) => {
                response.headers.set(key, value);
            });
            return response;
        }

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
        }, { status: 200 });

        Object.entries(customHeaders).forEach(([key, value]) => {
            response.headers.set(key, value);
        });

        return response;

    } catch (err: any) {
        console.error("[Runtime] Error:", err);
        const status = err.status || 500;
        const msg = err.message || "Internal Error";

        // Auth check specific
        const isAuthErr = status === 401 || err.code === 'AUTH_MISSING';

        const customHeaders = runtimeHeaders({ auth: isAuthErr ? "missing" : "required" });

        const response = NextResponse.json({ error: msg }, { status });

        const headers: any = { ...customHeaders };
        headers["x-pulse-src"] = "runtime_error_boundary";

        Object.entries(headers).forEach(([key, value]) => {
            response.headers.set(key, value as string);
        });

        return response;
    }
}
