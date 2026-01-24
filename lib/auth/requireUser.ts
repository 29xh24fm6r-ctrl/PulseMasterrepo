import { NextResponse } from "next/server";
import { headers } from "next/headers";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export interface UserAuthResult {
    userId: string;
}

/**
 * Validates the request has a valid user ID from middleware-injected headers.
 *
 * CRITICAL: Uses headers() from next/headers (App Router) NOT req.headers (Pages Router)
 * Middleware-modified headers are ONLY accessible via headers() in App Router!
 *
 * Throws a structured error response if missing, which allows
 * the Runtime Provider to capture and trigger IPP.
 */
export async function requireUser(): Promise<UserAuthResult> {
    // ✅ App Router: Use headers() from next/headers to read middleware-injected headers
    const headersList = await headers();
    const raw = headersList.get("x-owner-user-id") || "";
    const userId = raw.trim();

    // Validate
    if (!userId || !UUID_RE.test(userId)) {
        throw { status: 401, code: "AUTH_MISSING", message: "User identity missing" };
    }

    return { userId };
}

/**
 * Standard error handler for Runtime API routes.
 * Converts known auth errors into the required JSON shape.
 */
export function handleRuntimeError(err: any) {
    if (err?.code === "AUTH_MISSING") {
        const res = NextResponse.json({
            ok: false,
            code: "AUTH_MISSING",
            message: "User identity missing"
        }, { status: 401 });
        res.headers.set("x-pulse-src", "runtime_auth_missing");
        res.headers.set("x-pulse-auth", "missing");
        return res;
    }

    if (err?.code === "FORBIDDEN") {
        return NextResponse.json({ error: err.message, code: err.code }, { status: 403 });
    }

    console.error("[Runtime API Error]", err);
    return NextResponse.json({ error: "Internal Server Error", code: "SERVER_ERROR" }, { status: 500 });
}
