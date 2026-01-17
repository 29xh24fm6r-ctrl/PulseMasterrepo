import { requireOpsAuth } from "@/lib/auth/opsAuth";
import { withCompatTelemetry } from "@/lib/compat/withCompatTelemetry";
import { getSupabaseAdminRuntimeClient } from "@/lib/runtime/supabase.runtime";

export async function GET(req: Request) {
    const gate = await requireOpsAuth(req as any);
    if (!gate.ok) return Response.json(gate, { status: gate.status });

    return withCompatTelemetry({
        req: req as any,
        userIdUuid: gate.canon.userIdUuid,
        clerkUserId: gate.canon.clerkUserId,
        eventName: "api.deals.get",
        handler: async () => {
            const { data, error } = await getSupabaseAdminRuntimeClient()
                .from("deals")
                .select("*")
                .eq("user_id_uuid", gate.canon.userIdUuid)
                .order("created_at", { ascending: false })
                .limit(100);

            if (error) throw error;

            const deals = (data ?? []).map((d: any) => ({
                id: d.id,
                createdAt: d.created_at ?? null,
                name: d.name ?? "",
                stage: d.stage ?? "unknown",
                amount: d.amount ?? null,
                closeDate: d.close_date ?? null,
                raw: d,
            }));

            return Response.json({ ok: true, deals }, { status: 200 });
        },
    });
}
