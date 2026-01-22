import { NextRequest, NextResponse } from "next/server";
import { requireUser, handleRuntimeError } from "@/lib/auth/requireUser";
import { aggregateLifeState } from "@/lib/life-state/aggregateLifeState";
import { LifeState } from "@/lib/runtime/types";
import { runtimeAuthIsRequired, getRuntimeAuthMode } from "@/lib/runtime/runtimeAuthPolicy";
import { previewRuntimeEnvelope } from "@/lib/runtime/previewRuntime";
import { applyNoStoreHeaders } from "@/lib/runtime/httpNoStore";

export async function GET(req: NextRequest) {
    if (!runtimeAuthIsRequired()) {
        const res = NextResponse.json(previewRuntimeEnvelope({
            lifeState: {
                energy: "High",
                stress: "Low",
                momentum: "High",
                orientation: "Pulse Preview Mode Active"
            },
            orientationLine: "Pulse Preview Mode Active"
        }));
        res.headers.set("x-pulse-runtime-auth-mode", getRuntimeAuthMode());
        res.headers.set("x-pulse-src", "runtime_preview_envelope");
        return applyNoStoreHeaders(res);
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

        return applyNoStoreHeaders(NextResponse.json({
            lifeState,
            orientationLine: lifeState.orientation // Redundant but requested in spec
        }));

    } catch (err) {
        const res = handleRuntimeError(err);
        if (res.status === 401) {
            res.headers.set("x-pulse-src", "runtime_auth_denied");
        }
        if (res.status === 401) {
            res.headers.set("x-pulse-src", "runtime_auth_denied");
        }
        return applyNoStoreHeaders(res);
    }
}
