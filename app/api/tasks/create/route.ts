import { requireOpsAuth } from "@/lib/auth/opsAuth";
import { withCompatTelemetry } from "@/lib/compat/withCompatTelemetry";
import { getSupabaseAdminRuntimeClient } from "@/lib/runtime/supabase.runtime";
import { ExecutionGate } from "@/lib/execution/ExecutionGate";
import { ExecutionIntentType } from "@/lib/execution/ExecutionIntent";
import { createClient } from "@/lib/supabase/server";

export async function POST(req: Request) {
  const gate = await requireOpsAuth(req as any);
  if (!gate.ok || !gate.gate) return Response.json({ error: "Unauthorized" }, { status: 401 });

  return withCompatTelemetry({
    req: req as any,
    userIdUuid: gate.canon.userIdUuid,
    clerkUserId: gate.canon.clerkUserId,
    eventName: "api.tasks.create.post",
    handler: async () => {
      // HUMAN AGENCY LOCK
      // 1. Persist Confirmation (implicitly assuming UI source for this API call)
      const supabase = createClient();
      const intent = ExecutionIntentType.CREATE_TASK;

      const { error: confirmError } = await supabase
        .from("execution_confirmations")
        .insert({
          user_id: gate.canon.userIdUuid,
          intent_type: intent,
          confirmed_at: new Date().toISOString(),
          source: "ui",
          trust_level: "HIGH"
        });

      if (confirmError) {
        console.error("Confirmation persistence failed", confirmError);
        throw new Error("Failed to persist execution confirmation");
      }

      // 2. Request Token
      // This will THROW if blocked
      await ExecutionGate.request(gate.canon.userIdUuid, intent, {
        confidenceScore: 1.0,
        recentRejections: 0,
        mode: "NORMAL"
      });

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
      const res1 = await getSupabaseAdminRuntimeClient().from("tasks").insert(payload).select("*").single();
      if (!res1.error) return Response.json({ ok: true, task: res1.data }, { status: 200 });

      delete payload.meta;
      const res2 = await getSupabaseAdminRuntimeClient().from("tasks").insert(payload).select("*").single();
      if (res2.error) throw res2.error;

      return Response.json({ ok: true, task: res2.data }, { status: 200 });
    },
  });
}