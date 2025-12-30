import { requireOpsAuth } from "@/lib/auth/opsAuth";
import { withCompatTelemetry } from "@/lib/compat/withCompatTelemetry";
import { supabaseAdmin } from "@/lib/supabase";

export async function PATCH(req: Request) {
    const gate = await requireOpsAuth(req as any);

    return withCompatTelemetry({
        req: req as any,
        userIdUuid: gate.canon.userIdUuid,
        clerkUserId: gate.canon.clerkUserId,
        eventName: "api.tasks.update.patch",
        handler: async () => {
            const body = (await req.json().catch(() => ({}))) as {
                id?: string;
                title?: string;
                status?: string;
                dueAt?: string | null;
                meta?: Record<string, any>;
            };

            if (!body.id) return Response.json({ ok: false, error: "missing_id" }, { status: 400 });

            const patch: any = {};
            if (body.title !== undefined) patch.title = body.title;
            if (body.status !== undefined) patch.status = body.status;
            if (body.dueAt !== undefined) patch.due_at = body.dueAt;
            if (body.meta !== undefined) patch.meta = body.meta;

            const res1 = await supabaseAdmin
                .from("tasks")
                .update(patch)
                .eq("id", body.id)
                .eq("user_id_uuid", gate.canon.userIdUuid)
                .select("*")
                .single();

            if (!res1.error) return Response.json({ ok: true, task: res1.data }, { status: 200 });

            if ("meta" in patch) {
                delete patch.meta;
                const res2 = await supabaseAdmin
                    .from("tasks")
                    .update(patch)
                    .eq("id", body.id)
                    .eq("user_id_uuid", gate.canon.userIdUuid)
                    .select("*")
                    .single();
                if (res2.error) throw res2.error;
                return Response.json({ ok: true, task: res2.data }, { status: 200 });
            }

            throw res1.error;
        },
    });
}
