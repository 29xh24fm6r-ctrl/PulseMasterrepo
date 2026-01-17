import { NextResponse } from "next/server";
import { requireOpsAuth } from "@/lib/auth/opsAuth";
import { withCompatTelemetry } from "@/lib/compat/withCompatTelemetry";
import { getSupabaseAdminRuntimeClient } from "@/lib/runtime/supabase.runtime";

export async function GET(req: Request) {
    const gate = await requireOpsAuth(req as any);
    if (!gate.ok || !gate.gate) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    return withCompatTelemetry({
        req: req as any,
        userIdUuid: gate.gate.canon.userIdUuid,
        clerkUserId: gate.gate.canon.clerkUserId,
        eventName: "api.followups.get",
        handler: async () => {
            const { data, error } = await getSupabaseAdminRuntimeClient()
                .from("follow_ups")
                .select("*")
                .eq("user_id_uuid", gate.gate.canon.userIdUuid)
                .order("due_at", { ascending: true, nullsFirst: false })
                .limit(200);

            if (error) throw error;
            return Response.json({ ok: true, followUps: data ?? [] }, { status: 200 });
        },
    });
}
