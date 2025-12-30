import { requireOpsAuth } from "@/lib/auth/opsAuth";
import { withCompatTelemetry } from "@/lib/compat/withCompatTelemetry";
import { compatOk } from "@/lib/compat/compatOk";

export async function GET(req: Request) {
    const gate = await requireOpsAuth(req as any);
    if (!gate.ok) return Response.json(gate, { status: gate.status });

    return withCompatTelemetry({
        req: req as any,
        userIdUuid: gate.canon.userIdUuid,
        clerkUserId: gate.canon.clerkUserId,
        eventName: "compat.api.frontier.dashboard.get",
        handler: async () =>
            compatOk({
                dashboard: {
                    cards: [],
                    metrics: {},
                },
            }),
    });
}
