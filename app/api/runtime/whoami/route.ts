/**
 * Phase 25K-H
 * Absolute runtime-only identity probe.
 * ZERO Next.js helpers. ZERO build-time hooks.
 */

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
    // Absolute build-time escape hatch
    if (process.env.NEXT_PHASE === "phase-production-build") {
        return new Response(
            JSON.stringify({ ok: true, authed: false, build: true }),
            {
                status: 200,
                headers: {
                    "content-type": "application/json",
                    "cache-control": "no-store",
                },
            }
        );
    }

    let userId: string | null = null;

    try {
        const clerk = await import("@clerk/nextjs/server");
        const auth = clerk.auth?.();
        userId = auth?.userId ?? null;
    } catch {
        userId = null;
    }

    return new Response(
        JSON.stringify({
            ok: true,
            authed: Boolean(userId),
            userId,
        }),
        {
            status: 200,
            headers: {
                "content-type": "application/json",
                "cache-control": "no-store, no-cache, must-revalidate",
                pragma: "no-cache",
                expires: "0",
                "x-pulse-runtime": "whoami",
            },
        }
    );
}
