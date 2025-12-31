// lib/events/trackRequestEvent.ts
import type { NextRequest } from "next/server";
import { writePulseEvent } from "@/lib/events/writePulseEvent";

export async function trackRequestEvent(args: {
    req: NextRequest;
    userIdUuid: string;
    clerkUserId?: string;
    eventName: string;
    status?: number;
    latencyMs?: number;
    properties?: Record<string, any>;
}) {
    const url = new URL(args.req.url);

    await writePulseEvent({
        userIdUuid: args.userIdUuid,
        userIdText: args.clerkUserId ?? null,
        eventName: args.eventName,
        path: url.pathname,
        method: args.req.method,
        status: args.status ?? null,
        latencyMs: args.latencyMs ?? null,
        userAgent: args.req.headers.get("user-agent"),
        referrer: args.req.headers.get("referer"),
        requestId: args.req.headers.get("x-request-id"),
        properties: args.properties ?? {},
    });
}
