import { requireOpsAuth } from "@/lib/auth/opsAuth";
import { withCompatTelemetry } from "@/lib/compat/withCompatTelemetry";
import { supabaseAdmin } from "@/lib/supabase";

export async function GET(req: Request) {
    const gate = await requireOpsAuth(req as any);

    return withCompatTelemetry({
        req: req as any,
        userIdUuid: gate.canon.userIdUuid,
        clerkUserId: gate.canon.clerkUserId,
        eventName: "api.followups.get",
        handler: async () => {
            const { data, error } = await supabaseAdmin
                .from("follow_ups")
                .select("*")
                .eq("user_id_uuid", gate.canon.userIdUuid)
                .order("due_at", { ascending: true, nullsFirst: false })
                .limit(200);

            if (error) throw error;
            return Response.json({ ok: true, followUps: data ?? [] }, { status: 200 });
        },
    });
}
