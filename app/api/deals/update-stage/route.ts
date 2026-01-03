import { NextResponse } from "next/server";
import { requireOpsAuth } from "@/lib/auth/opsAuth";
import { withCompatTelemetry } from "@/lib/compat/withCompatTelemetry";
import { supabaseAdmin } from "@/lib/supabase";

export async function PATCH(req: Request) {
    const gate = await requireOpsAuth(req as any);
    if (!gate.ok || !gate.gate) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    return withCompatTelemetry({
        req: req as any,
        userIdUuid: gate.gate.canon.userIdUuid,
        clerkUserId: gate.gate.canon.clerkUserId,
        eventName: "api.deals.update_stage.patch",
        handler: async () => {
            const body = (await req.json().catch(() => ({}))) as { id?: string; stage?: string };
            if (!body.id || !body.stage) {
                return Response.json({ ok: false, error: "missing_id_or_stage" }, { status: 400 });
            }

            const { data, error } = await supabaseAdmin
                .from("deals")
                .update({ stage: body.stage })
                .eq("id", body.id)
                .eq("user_id_uuid", gate.gate.canon.userIdUuid)
                .select("*")
                .single();

            if (error) throw error;
            return Response.json({ ok: true, deal: data }, { status: 200 });
        },
    });
}
