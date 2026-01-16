import { NextResponse } from 'next/server';

/**
 * ⚠️ DEV-ONLY AUTH BOOTSTRAP (ANTIGRAVITY)
 *
 * This endpoint exists solely to support development/preview bypass flows.
 * It returns the canonical dev userId and sets the dev bypass cookie so the
 * client + middleware converge on a single identity source of truth.
 *
 * IMPORTANT:
 * - NOT production authentication.
 * - MUST derive userId from server-side configuration ONLY (env/cookie/db).
 * - MUST NOT accept a userId from client input.
 * - MUST return Cache-Control: no-store (success and error) to avoid stale identity.
 *
 * If you are implementing production auth, do not reuse this route—create a proper
 * auth/session flow instead.
 */
export async function POST() {
    // Prefer server-only env var, fallback to public one if missing
    const devUserId = process.env.PULSE_DEV_USER_ID || process.env.NEXT_PUBLIC_DEV_PULSE_OWNER_USER_ID;

    if (!devUserId) {
        return NextResponse.json(
            { ok: false, error: "missing_env" },
            {
                status: 400,
                headers: { "Cache-Control": "no-store" } // HARDENING: No cache on error
            }
        );
    }

    const res = NextResponse.json({ ok: true, userId: devUserId });

    // Set cookie on the response so the browser stores it immediately
    // Needed for middleware bypass
    const isProduction = process.env.NODE_ENV === "production";

    res.cookies.set("x-pulse-dev-user-id", devUserId, {
        path: "/",
        sameSite: "lax",
        httpOnly: true,  // HARDENING: Client JS doesn't need to read this
        secure: isProduction, // HARDENING: Allow http on localhost
    });

    // HARDENING: Prevent caching of the bootstrap response
    res.headers.set("Cache-Control", "no-store");

    return res;
}
