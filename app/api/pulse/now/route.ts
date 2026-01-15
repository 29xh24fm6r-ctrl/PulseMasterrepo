import { NextResponse } from 'next/server';
import { buildSignalBundle } from '@/lib/now-engine/buildSignalBundle';
import { computeNow } from '@/lib/now-engine/computeNow';
import { logNowEvent } from '@/lib/now-engine/telemetry';
import { auth } from '@clerk/nextjs/server'; // Assuming Clerk, based on middleware

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

        const bundle = await buildSignalBundle(userId);
        const result = computeNow(bundle);

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

        return response;
    } catch (error) {
        console.error("[NOW_ENGINE]", error);
        return new NextResponse("Internal Error", { status: 500 });
    }
}
