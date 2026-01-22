import { NextResponse } from "next/server";

/**
 * Phase 25K-G
 * Absolute runtime-only identity probe.
 * This route MUST NEVER be statically evaluated.
 */

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
    // HARD BUILD-TIME KILL SWITCH
    // If this ever runs at build, we immediately short-circuit.
    if (process.env.NEXT_PHASE === "phase-production-build") {
        return NextResponse.json(
            { ok: true, authed: false, build: true },
            {
                headers: {
                    "cache-control": "no-store",
                },
            }
        );
    }

    let userId: string | null = null;

    try {
        // Dynamic import INSIDE handler (never hoisted)
        const clerk = await import("@clerk/nextjs/server");
        const auth = clerk.auth?.();
        userId = auth?.userId ?? null;
    } catch {
        // Clerk unavailable or not configured — expected in Preview/CI
        userId = null;
    }

    return NextResponse.json(
        {
            ok: true,
            authed: Boolean(userId),
            userId,
        },
        {
            headers: {
                "cache-control": "no-store, no-cache, must-revalidate",
                pragma: "no-cache",
                expires: "0",
                "x-pulse-runtime": "whoami",
            },
        }
    );
}
