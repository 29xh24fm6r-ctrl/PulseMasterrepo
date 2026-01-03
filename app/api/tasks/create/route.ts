import { requireOpsAuth } from "@/lib/auth/opsAuth";
import { withCompatTelemetry } from "@/lib/compat/withCompatTelemetry";
import { supabaseAdmin } from "@/lib/supabase";

export async function POST(req: Request) {
  const gate = await requireOpsAuth(req as any);
  if (!gate.ok || !gate.gate) return Response.json({ error: "Unauthorized" }, { status: 401 });

  return withCompatTelemetry({
    req: req as any,
    userIdUuid: gate.canon.userIdUuid,
    clerkUserId: gate.canon.clerkUserId,
    eventName: "api.tasks.create.post",
    handler: async () => {
      const body = (await req.json().catch(() => ({}))) as {
        title?: string;
        status?: string;
        dueAt?: string | null;
        meta?: Record<string, any>;
      };

      const payload: any = {
        user_id_uuid: gate.canon.userIdUuid,
        title: body.title ?? "",
        status: body.status ?? "open",
        due_at: body.dueAt ?? null,
        meta: body.meta ?? {},
      };

      // Try with meta; retry without if column missing
      const res1 = await supabaseAdmin.from("tasks").insert(payload).select("*").single();
      if (!res1.error) return Response.json({ ok: true, task: res1.data }, { status: 200 });

      delete payload.meta;
      const res2 = await supabaseAdmin.from("tasks").insert(payload).select("*").single();
      if (res2.error) throw res2.error;

      return Response.json({ ok: true, task: res2.data }, { status: 200 });
    },
  });
}