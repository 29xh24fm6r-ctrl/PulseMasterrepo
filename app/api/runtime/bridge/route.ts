import { NextRequest, NextResponse } from "next/server";
import { requireUser, handleRuntimeError } from "@/lib/auth/requireUser";
import { v4 as uuidv4 } from 'uuid';
import { Message } from "@/lib/runtime/types";
import { resolveSubscription } from "@/lib/subscription/resolveSubscription";
import { getDailyAICallCount, trackAIUsage } from "@/services/usage";
import { runtimeAuthIsRequired, getRuntimeAuthMode } from "@/lib/runtime/runtimeAuthPolicy";
import { previewRuntimeEnvelope } from "@/lib/runtime/previewRuntime";

export async function POST(req: NextRequest) {
    // 1. Preview Mode / CI Bypass
    if (!runtimeAuthIsRequired()) {
        const res = NextResponse.json(previewRuntimeEnvelope({
            reply: {
                id: "preview-echo",
                role: "pulse",
                content: "[PREVIEW MODE] Bridge writes are disabled.",
                timestamp: new Date(),
                hasExplanation: false
            }
        }));
        res.headers.set("x-pulse-runtime-auth-mode", getRuntimeAuthMode());
        res.headers.set("x-pulse-src", "runtime_preview_envelope");
        return res;
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
                const res = NextResponse.json(payload, { status: 403 });
                res.headers.set("x-pulse-src", "runtime_limit_reached");
                return res;
            }
        }

        const body = await req.json();
        const text = body.text;

        if (!text) {
            return NextResponse.json({ error: "No text provided" }, { status: 400 });
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

        return NextResponse.json({ reply });

    } catch (err) {
        const res = handleRuntimeError(err);
        if (res.status === 401) {
            res.headers.set("x-pulse-src", "runtime_auth_denied");
        }
        return res;
    }
}
