import { NextRequest } from "next/server";
import { requireUser } from "@/lib/auth/requireUser";
import { LifeState, NotableEvent } from "@/lib/runtime/types";
import { aggregateLifeState } from "@/lib/life-state/aggregateLifeState";
import { runtimeAuthIsRequired, getRuntimeAuthMode } from "@/lib/runtime/runtimeAuthPolicy";
import { previewRuntimeEnvelope } from "@/lib/runtime/previewRuntime";
import { runtimeHeaders } from "@/lib/runtime/runtimeHeaders";

export async function GET(req: NextRequest) {
    if (!runtimeAuthIsRequired()) {
        const body = previewRuntimeEnvelope({
            life: { condition: "nominal", energy: 100, focus: 100, mood: "calm" },
            trends: [],
            notable: []
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
            const raw = await aggregateLifeState(userId);
            lifeState = {
                energy: raw.energy,
                stress: raw.stress,
                momentum: raw.momentum,
                orientation: raw.summary || "Phase 10 initialized."
            };
        } catch (e) {
            console.warn("State aggregation failed, safe default", e);
            lifeState = { energy: 'Medium', stress: 'Medium', momentum: 'Medium', orientation: "System standby." };
        }

        const todayLabel = new Date().toLocaleDateString('en-US', { weekday: 'short' });
        const trends = {
            energy: [{ day: todayLabel.charAt(0), value: mapLevelToValue(lifeState.energy), label: todayLabel }],
            stress: [{ day: todayLabel.charAt(0), value: mapLevelToValue(lifeState.stress), label: todayLabel }],
            momentum: [{ day: todayLabel.charAt(0), value: mapLevelToValue(lifeState.momentum), label: todayLabel }],
        };

        const notables: NotableEvent[] = [];

        return new Response(JSON.stringify({
            lifeState,
            trends,
            notables
        }), {
            status: 200,
            headers: {
                "Content-Type": "application/json",
                ...runtimeHeaders({ auth: "required" })
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

function mapLevelToValue(level: string): number {
    switch (level) {
        case 'High': return 8;
        case 'Medium': return 5;
        case 'Low': return 2;
        default: return 5;
    }
}
