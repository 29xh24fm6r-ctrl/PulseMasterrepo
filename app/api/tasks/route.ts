import { requireOpsAuth } from "@/lib/auth/opsAuth";
import { withCompatTelemetry } from "@/lib/compat/withCompatTelemetry";
import { supabaseAdmin } from "@/lib/supabase";

export async function GET(req: Request) {
    const gate = await requireOpsAuth(req as any);
    if (!gate.ok || !gate.gate) return Response.json(gate, { status: gate.status });

    return withCompatTelemetry({
        req: req as any,
        userIdUuid: gate.canon.userIdUuid,
        clerkUserId: gate.canon.clerkUserId,
        eventName: "api.tasks.get",
        handler: async () => {
            const { data, error } = await supabaseAdmin
                .from("tasks")
                .select("*")
                .eq("user_id_uuid", gate.canon.userIdUuid)
                .order("created_at", { ascending: false })
                .limit(100);

            if (error) throw error;

            // UI-safe normalization (no assumptions)
            const tasks = (data ?? []).map((t: any) => ({
                id: t.id,
                createdAt: t.created_at ?? null,
                title: t.title ?? "",
                status: t.status ?? "open",
                dueAt: t.due_at ?? null,
                priority: t.priority ?? null,
                raw: t, // keep raw payload for future UI expansion
            }));

            return Response.json({ ok: true, tasks }, { status: 200 });
        },
    });
}
