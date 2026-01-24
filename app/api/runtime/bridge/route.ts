import { NextRequest } from "next/server";
import { requireUserId } from "@/lib/runtime/requireUserId";
import { v4 as uuidv4 } from 'uuid';
import { Message } from "@/lib/runtime/types";
import { resolveSubscription } from "@/lib/subscription/resolveSubscription";
import { getDailyAICallCount, trackAIUsage } from "@/services/usage";
import { runtimeAuthIsRequired, getRuntimeAuthMode } from "@/lib/runtime/runtimeAuthPolicy";
import { previewRuntimeEnvelope } from "@/lib/runtime/previewRuntime";
import { runtimeResponse } from "@/lib/runtime/runtimeResponse";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
    // 1. Preview Mode / CI Bypass
    if (!runtimeAuthIsRequired()) {
        const body = previewRuntimeEnvelope({
            reply: {
                id: "preview-echo",
                role: "pulse",
                content: "[PREVIEW MODE] Bridge writes are disabled.",
                timestamp: new Date(),
                hasExplanation: false
            }
        });
        // Note: runtimeResponse handles the auth header, but we need to inject the extra preview headers?
        // Actually runtimeResponse ONLY sets standard headers. 
        // If we need extra headers for preview ("x-pulse-runtime-auth-mode", "x-pulse-src"), 
        // runtimeResponse might not be flexible enough OR we should adhere to the strict pattern.
        // The previous pattern used manually constructed headers.
        // However, the Goal is "strict header compliance".
        // The "Phase 25K" spec likely implies standard headers are enough, OR runtimeResponse should handle extras?
        // Let's look at `runtimeResponse.ts` again. It takes (body, status, auth). It calls `runtimeHeaders`.
        // It does NOT support extra headers.

        // However, `x-pulse-runtime-auth-mode` and `x-pulse-src` are diagnostic.
        // If I strictly use runtimeResponse, I lose them unless I modify runtimeResponse or wrap it.
        // But the user said "Strict Header Compliance ... by refactoring them to use a single response constructor."
        // And "The user's goal is to ensure all runtime API routes strictly adhere to canonical header requirements".
        // Maybe the diagnostic headers are less important than the CANONICAL ones (Cache-Control, etc)?
        // OR `runtimeResponse` should be updated to accept extra headers?
        // Let's checking `state/route.ts` which I said was "Correct".
        // It does NOT set `x-pulse-src`.

        // Wait, `state/route.ts` catch block:
        /*
            if (status === 401) { auth = "missing"; }
            body = { error: msg };
            // it does NOT set x-pulse-src: runtime_error_boundary
        */

        // So sticking to `runtimeResponse` means dropping those custom headers.
        // Given the "Strict Header Compliance" goal, using the standardized helper is safer than manual construction.
        // I will use runtimeResponse and drop the extra headers for now, assuming the canonical headers are what matters for "Immunity".

        return runtimeResponse(body, 200, "bypassed");
    }

    try {
        const userId = await requireUserId(req);
        if (!userId) {
            return runtimeResponse({ error: "User identity missing" }, 401, "missing");
        }

        // 2. Subscription Check
        const sub = await resolveSubscription(userId);
        if (sub.limits?.bridgeMessagesPerDay) {
            const count = await getDailyAICallCount(userId);
            if (count >= sub.limits.bridgeMessagesPerDay) {
                const payload = {
                    code: 'LIMIT_REACHED',
                    message: "Daily limit reached"
                };
                return runtimeResponse(payload, 403, "required");
            }
        }

        const body = await req.json();
        const text = body.text;

        if (!text) {
            return runtimeResponse({ error: "No text provided" }, 400, "required");
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

        return runtimeResponse({ reply }, 200, "required");

    } catch (err: any) {
        // SAFE ERROR HANDLING
        console.error("[Bridge] Error:", err);
        const status = err.status || 500;
        const msg = err.message || "Internal Error";

        // Manual error response construction via helper
        return runtimeResponse({ error: msg }, status, "missing");
    }
}
