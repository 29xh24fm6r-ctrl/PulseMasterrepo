import { NextResponse } from "next/server";
import { requireOpsAuth } from "@/lib/auth/opsAuth";
import { withCompatTelemetry } from "@/lib/compat/withCompatTelemetry";
import { supabaseAdmin } from "@/lib/supabase";

export async function POST(req: Request) {
    const gate = await requireOpsAuth(req as any);
    if (!gate.ok || !gate.gate) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    return withCompatTelemetry({
        req: req as any,
        userIdUuid: gate.gate.canon.userIdUuid,
        clerkUserId: gate.gate.canon.clerkUserId,
        eventName: "api.followups.update_status",
        handler: async () => {
            const body = (await req.json().catch(() => ({}))) as {
                id?: string;
                status?: string;
                dueAt?: string | null;
            };

            if (!body.id || !body.status) {
                return Response.json({ ok: false, error: "missing_id_or_status" }, { status: 400 });
            }

            const patch: any = { status: body.status };
            if (body.dueAt !== undefined) patch.due_at = body.dueAt;

            const { data, error } = await supabaseAdmin
                .from("follow_ups")
                .update(patch)
                .eq("id", body.id)
                .eq("user_id_uuid", gate.gate.canon.userIdUuid)
                .select("*")
                .single();

            if (error) throw error;
            return Response.json({ ok: true, followUp: data }, { status: 200 });
        },
    });
}
