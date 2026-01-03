import { requireOpsAuth } from "@/lib/auth/opsAuth";
import { withCompatTelemetry } from "@/lib/compat/withCompatTelemetry";

export async function GET(req: Request) {
    const gate = await requireOpsAuth(req as any);
    if (!gate.ok || !gate.gate) return Response.json(gate, { status: gate.status });

    // Minimal compat: return settings from canon user object if you already have them,
    // otherwise stable defaults so UI doesn't crash.
    return withCompatTelemetry({
        req: req as any,
        userIdUuid: gate.canon.userIdUuid,
        clerkUserId: gate.canon.clerkUserId,
        eventName: "compat.api.user.settings.get",
        handler: async () =>
            Response.json(
                {
                    ok: true,
                    settings: {
                        timezone: "UTC",
                        week_starts_on: "monday",
                        theme: "system",
                    },
                    compat: true,
                },
                { status: 200 }
            ),
    });
}
