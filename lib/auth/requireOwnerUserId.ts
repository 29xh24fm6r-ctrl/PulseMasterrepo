// lib/auth/requireOwnerUserId.ts
import { NextRequest } from "next/server";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function requireOwnerUserId(req: NextRequest): string {
    const raw = req.headers.get("x-owner-user-id") || "";
    const userId = raw.trim();
    if (!UUID_RE.test(userId)) {
        throw new Error("Missing or invalid x-owner-user-id");
    }
    return userId;
}
