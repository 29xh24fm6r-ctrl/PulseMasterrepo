import { NextRequest, NextResponse } from "next/server";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export interface UserAuthResult {
    userId: string;
}

/**
 * Validates the request has a valid user ID (via standard headers).
 * Throws a structured error response if missing, which allows
 * the Runtime Provider to capture and trigger IPP.
 */
export function requireUser(req: NextRequest): UserAuthResult {
    // 1. Check Standard Header (Dev/Prod Standard)
    const raw = req.headers.get("x-owner-user-id") || "";
    const userId = raw.trim();

    // 2. Validate
    if (!userId || !UUID_RE.test(userId)) {
        // We throw a special error that the route handler is expected to catch
        // or we can fallback to returning null and letting the route handle it.
        // However, to ensure consistency, we'll throw a specific object 
        // that our routes can catch and convert to JSON.
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
        return NextResponse.json({ error: err.message, code: err.code }, { status: 401 });
    }

    if (err?.code === "FORBIDDEN") {
        return NextResponse.json({ error: err.message, code: err.code }, { status: 403 });
    }

    console.error("[Runtime API Error]", err);
    return NextResponse.json({ error: "Internal Server Error", code: "SERVER_ERROR" }, { status: 500 });
}
