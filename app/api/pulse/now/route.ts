import { NextResponse } from 'next/server';
import { buildSignalBundle } from '@/lib/now-engine/buildSignalBundle';
import { computeNow } from '@/lib/now-engine/computeNow';
import { logNowEvent } from '@/lib/now-engine/telemetry';
import { auth } from '@clerk/nextjs/server'; // Assuming Clerk, based on middleware
import { TraceStore } from "@/lib/trace/TraceStore";
import { DecisionTrace } from "@/lib/trace/DecisionTrace";
import { v4 as uuidv4 } from 'uuid';

import { isRhythmEligible } from '@/lib/rhythm/isRhythmEligible';

export async function GET(request: Request) {
    try {
        let { userId } = auth();

        // Dev Bypass
        if (process.env.NODE_ENV === "development" && !userId) {
            const devUser = request.headers.get("x-pulse-dev-user-id");
            if (devUser) {
                userId = devUser;
                console.log("[NOW_API] Using Dev User ID:", devUser);
            }
        }

        if (!userId) {
            return new NextResponse("Unauthorized", { status: 401 });
        }

        const rhythmCheck = isRhythmEligible(new Date()); // TODO: Pass lastInteractionTime if available from contexts

        let bundle = await buildSignalBundle(userId);
        let result: any; // Using any temporarily to bypass strict typing if NowResult doesn't support idle yet

        if (!rhythmCheck.eligible) {
            result = {
                status: "pulse_idle",
                explanation: rhythmCheck.reason || "Pulse is resting.",
                primary_focus: { key: "idle", title: "Pulse is Idle", confidence: 0 }
            };
        } else {
            result = computeNow(bundle);
        }

        // Task F.3: Add Contract Headers for Debugging
        const response = NextResponse.json(result);
        if (process.env.NODE_ENV === "development") {
            response.headers.set("X-Pulse-Now-State", result.status);
            response.headers.set("X-Pulse-Now-Version", "v1.0.0");
        }

        // Phase J: Telemetry (now_computed)
        // Fire-and-forget, non-blocking
        logNowEvent({
            event: "now_computed",
            now_status: result.status,
            primary_candidate_id: result.status === 'resolved_now' ? result.primary_focus.key : undefined,
            confidence: result.status === 'resolved_now' ? result.primary_focus.confidence : undefined,
            signal_snapshot: {
                task_count: bundle.actions.length,
                has_focus: bundle.current_mode === 'focus',
                time_bucket: undefined // To be implemented if Time Bucket logic exists
            },
            engine_version: "v1.0.0",
            timestamp: Date.now()
        });

        // PHASE 15: DECISION TRACE (Observable Intelligence)
        const traceId = uuidv4();
        const trace: DecisionTrace = {
            trace_id: traceId,
            user_id: userId,
            created_at: new Date().toISOString(),
            created_at: new Date().toISOString(),
            detected_intent: rhythmCheck.eligible ? (result.status === 'resolved_now' ? "OFFER_SUGGESTION" : "WAIT_FOR_INTENT") : "IDLE_MODE",
            confidence_score: result.status === 'resolved_now' ? (result.primary_focus.confidence || 0) : 0,
            trust_level: "HIGH", // Default for Now Engine (verified by internal weights)
            user_mode: "NORMAL", // simplified for now, should pull from context
            gates: { trust_gate: "pass", agency_gate: "pass", safety_gate: "pass" },
            outcome: (rhythmCheck.eligible && result.status === 'resolved_now') ? "spoken" : "silent",
            explanation_summary: ""
        };

        // Construct Explanation
        if (!rhythmCheck.eligible) {
            trace.explanation_summary = `I noticed it is now outside of my rhythm windows. I decided to stay silent. Next time I will check back in the next window.`;
        } else if (result.status === 'resolved_now') {
            trace.explanation_summary = `I noticed you have ${bundle.actions.length} active items. I considered suggesting '${result.primary_focus.title}'. My confidence score of ${trace.confidence_score.toFixed(2)} allowed me to suggest this as the best focus. Next time I will re-evaluate based on new signals.`;
        } else {
            trace.explanation_summary = `I noticed no single dominant focus signal. I considered suggesting a task but my confidence calc was below threshold. I decided to wait for your intent. Next time I will offer a suggestion if a clear priority emerges.`;
        }

        // Persist Trace
        TraceStore.persist(trace).catch(err => console.error("Trace persist failed", err));

        return response;
    } catch (error) {
        console.error("[NOW_ENGINE]", error);
        return new NextResponse("Internal Error", { status: 500 });
    }
}
