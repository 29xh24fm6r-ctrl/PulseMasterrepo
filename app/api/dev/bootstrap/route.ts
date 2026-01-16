import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * ⚠️ DEV-ONLY AUTH BOOTSTRAP (ANTIGRAVITY)
 *
 * This endpoint exists solely to support development/preview bypass flows.
 * It returns the canonical dev userId and sets the dev bypass cookie so the
 * client + middleware converge on a single identity source of truth.
 *
 * IMPORTANT:
 * - NOT production authentication.
 * - Enforces PULSE_ENABLE_DEV_BYPASS check.
 * - MUST derive userId from server-side configuration ONLY (env/cookie/db).
 * - MUST NOT accept a userId from client input.
 * - MUST return Cache-Control: no-store (success and error) to avoid stale identity.
 */
export async function POST() {
    const bypass = process.env.PULSE_ENABLE_DEV_BYPASS === "true";
    const devUserId =
        process.env.PULSE_DEV_USER_ID ||
        process.env.NEXT_PUBLIC_DEV_PULSE_OWNER_USER_ID;

    // Always use VERCEL_ENV to distinguish production from preview/development for cookie security
    const isProd = process.env.VERCEL_ENV === "production";

    const fail = (error: "bypass_disabled" | "missing_env") => {
        // DIAGNOSTIC HARDENING: Always return headers for diagnostics
        const res = NextResponse.json({ ok: false, error }, { status: 400 });
        res.headers.set("Cache-Control", "no-store");
        res.headers.set("X-Pulse-DevBootstrap", error);
        return res;
    };

    if (!bypass) return fail("bypass_disabled");
    if (!devUserId || devUserId.length === 0) return fail("missing_env");

    const res = NextResponse.json({ ok: true, userId: devUserId });
    res.headers.set("Cache-Control", "no-store");
    res.headers.set("X-Pulse-DevBootstrap", "ok");

    // Cookie is still needed for middleware bypass
    res.cookies.set("x-pulse-dev-user-id", devUserId, {
        path: "/",
        sameSite: "lax",
        httpOnly: true,
        secure: isProd,
    });

    return res;
}
