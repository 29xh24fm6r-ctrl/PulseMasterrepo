import "server-only";

import type { NextRequest } from "next/server";
import { trackRequestEvent } from "@/lib/events/trackRequestEvent";

type CompatTelemetryArgs = {
    req: NextRequest;
    userIdUuid: string;
    clerkUserId?: string;
    eventName: string; // e.g. "compat.api.followups.get"
    handler: () => Promise<Response>;
};

export async function withCompatTelemetry(args: CompatTelemetryArgs): Promise<Response> {
    const t0 = Date.now();
    try {
        const res = await args.handler();
        await trackRequestEvent({
            req: args.req,
            userIdUuid: args.userIdUuid,
            clerkUserId: args.clerkUserId,
            eventName: args.eventName,
            status: res.status,
            latencyMs: Date.now() - t0,
            properties: { compat: true },
        });
        // Safely clone response if needed? trackRequestEvent reads headers/url from req, not res body.
        return res;
    } catch (err: any) {
        await trackRequestEvent({
            req: args.req,
            userIdUuid: args.userIdUuid,
            clerkUserId: args.clerkUserId,
            eventName: args.eventName,
            status: 500,
            latencyMs: Date.now() - t0,
            properties: { compat: true, error: String(err?.message ?? err) },
        });
        throw err;
    }
}
