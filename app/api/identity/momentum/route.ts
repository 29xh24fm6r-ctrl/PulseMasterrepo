import { requireOpsAuth } from "@/lib/auth/opsAuth";
import { withCompatTelemetry } from "@/lib/compat/withCompatTelemetry";
import { notImplemented } from "@/lib/compat/notImplemented";

export async function GET(req: Request) {
    const gate = await requireOpsAuth(req as any);
    if (!gate.ok) return Response.json(gate, { status: gate.status });

    return withCompatTelemetry({
        req: req as any,
        userIdUuid: gate.canon.userIdUuid,
        clerkUserId: gate.canon.clerkUserId,
        eventName: "compat.api.identity.momentum.get",
        handler: async () => notImplemented({ route: "/api/identity/momentum" }),
    });
}
