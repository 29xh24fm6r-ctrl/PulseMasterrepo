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
        // Restore diagnostic headers for preview if needed
        const headers: any = { ...customHeaders };
        headers["x-pulse-runtime-auth-mode"] = getRuntimeAuthMode();
        headers["x-pulse-src"] = "runtime_preview_envelope";

        return NextResponse.json(body, { headers });
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
        return NextResponse.json({
            lifeState,
            orientationLine: lifeState.orientation
        }, {
            headers: customHeaders as any
        });

    } catch (err: any) {
        console.error("[Runtime] Error:", err);
        const status = err.status || 500;
        const msg = err.message || "Internal Error";

        // Auth check specific
        const isAuthErr = status === 401 || err.code === 'AUTH_MISSING';

        const customHeaders = runtimeHeaders({ auth: isAuthErr ? "missing" : "required" });

        const headers: any = { ...customHeaders };
        headers["x-pulse-src"] = "runtime_error_boundary";

        return NextResponse.json({ error: msg }, { status, headers });
    }
}
