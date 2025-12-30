import { requireOpsAuth } from "@/lib/auth/opsAuth";
import { withCompatTelemetry } from "@/lib/compat/withCompatTelemetry";
import { notImplemented } from "@/lib/compat/notImplemented";

export async function POST(req: Request) {
    const gate = await requireOpsAuth(req as any);

    if (!gate.ok) { // Check auth success
        // requireOpsAuth returns { ok: false ... } on failure
        return Response.json(gate, { status: gate.status });
    }

    // gate is valid here, but Typescript might need narrowing if requireOpsAuth returns union
    // requireOpsAuth returns { ok: true, clerkUserId, userId, isAdmin, canon } | { ok: false ... }
    // So 'gate' here is the success type.

    return withCompatTelemetry({
        req: req as any,
        userIdUuid: gate.canon.userIdUuid,
        clerkUserId: gate.canon.clerkUserId,
        eventName: "compat.api.cron.proactive.post",
        handler: async () => notImplemented({ route: "/api/cron/proactive" }),
    });
}
