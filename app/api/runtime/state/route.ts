import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/requireUser";
import { LifeState, NotableEvent } from "@/lib/runtime/types";
import { aggregateLifeState } from "@/lib/life-state/aggregateLifeState";
import { runtimeAuthIsRequired } from "@/lib/runtime/runtimeAuthPolicy";
import { previewRuntimeEnvelope } from "@/lib/runtime/previewRuntime";
import { runtimeHeaders, PulseAuthHeader } from "@/lib/runtime/runtimeHeaders";

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(req: NextRequest) {
    let status = 200;
    let auth: PulseAuthHeader = "required";
    let body: any;

    if (!runtimeAuthIsRequired()) {
        body = previewRuntimeEnvelope({
            life: { condition: "nominal", energy: 100, focus: 100, mood: "calm" },
            trends: [],
            notable: []
        });
        auth = "bypassed";
    } else {
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

            body = {
                lifeState,
                trends,
                notables
            };
            auth = "required";

        } catch (err: any) {
            console.error("[Runtime] Error:", err);
            status = err.status || 500;
            const msg = err.message || "Internal Error";

            if (status === 401) {
                auth = "missing";
            }
            body = { error: msg };
        }
    }

    const customHeaders = runtimeHeaders({ auth });
    const response = NextResponse.json(body, { status });
    response.headers.delete('cache-control');
    response.headers.delete('pragma');
    response.headers.delete('expires');
    for (const [key, value] of Object.entries(customHeaders)) {
        response.headers.set(key, value);
    }
    return response;
}

function mapLevelToValue(level: string): number {
    switch (level) {
        case 'High': return 8;
        case 'Medium': return 5;
        case 'Low': return 2;
        default: return 5;
    }
}
