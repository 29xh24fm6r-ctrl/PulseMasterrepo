import { NextRequest, NextResponse } from "next/server";
import { requireUser, handleRuntimeError } from "@/lib/auth/requireUser";
import { v4 as uuidv4 } from 'uuid';
import { Message } from "@/lib/runtime/types";
import { resolveSubscription } from "@/lib/subscription/resolveSubscription";
import { getDailyAICallCount, trackAIUsage } from "@/services/usage";
import { runtimeAuthIsRequired, getRuntimeAuthMode } from "@/lib/runtime/runtimeAuthPolicy";
import { previewRuntimeEnvelope } from "@/lib/runtime/previewRuntime";
import { runtimeHeaders } from "@/lib/runtime/runtimeHeaders";

export async function POST(req: NextRequest) {
    // 1. Preview Mode / CI Bypass
    if (!runtimeAuthIsRequired()) {
        return new Response(JSON.stringify(previewRuntimeEnvelope({
            reply: {
                id: "preview-echo",
                role: "pulse",
                content: "[PREVIEW MODE] Bridge writes are disabled.",
                timestamp: new Date(),
                hasExplanation: false
            }
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

        // 2. Subscription Check
        const sub = await resolveSubscription(userId);
        if (sub.limits?.bridgeMessagesPerDay) {
            const count = await getDailyAICallCount(userId);
            if (count >= sub.limits.bridgeMessagesPerDay) {
                // Return 403 with specific code
                const payload = {
                    code: 'LIMIT_REACHED',
                    message: "Daily limit reached"
                };
                return new Response(JSON.stringify(payload), {
                    status: 403,
                    headers: {
                        ...runtimeHeaders({ authed: true }),
                        "x-pulse-src": "runtime_limit_reached"
                    }
                });
            }
        }

        const body = await req.json();
        const text = body.text;

        if (!text) {
            return new Response(JSON.stringify({ error: "No text provided" }), {
                status: 400,
                headers: runtimeHeaders({ authed: true })
            });
        }

        // 3. Track Usage (Increment Count)
        await trackAIUsage(userId, 'bridge_message', 'system-echo', { total_tokens: 1 });

        const reply: Message = {
            id: uuidv4(),
            role: 'pulse',
            content: `Server: Received "${text}" \n(Brain wiring pending exact entry point discovery)`,
            timestamp: new Date(),
            hasExplanation: false
        };

        return new Response(JSON.stringify({ reply }), {
            status: 200,
            headers: runtimeHeaders({ authed: true })
        });

    } catch (err) {
        const res = handleRuntimeError(err);
        const headers = runtimeHeaders({ authed: res.status !== 401 });
        Object.entries(headers).forEach(([k, v]) => res.headers.set(k, v));

        if (res.status === 401) {
            res.headers.set("x-pulse-src", "runtime_auth_denied");
        }
        return res;
    }
}
