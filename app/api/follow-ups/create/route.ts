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
    eventName: "api.followups.create",
    handler: async () => {
      const body = (await req.json().catch(() => ({}))) as {
        title?: string;
        body?: string;
        dueAt?: string | null;
        status?: string;
        source?: string;
        meta?: Record<string, any>;
      };

      const payload = {
        user_id_uuid: gate.gate.canon.userIdUuid,
        title: body.title ?? "",
        body: body.body ?? "",
        due_at: body.dueAt ?? null,
        status: body.status ?? "open",
        source: body.source ?? "manual",
        meta: body.meta ?? {},
      };

      const { data, error } = await supabaseAdmin
        .from("follow_ups")
        .insert(payload)
        .select("*")
        .single();

      if (error) throw error;
      return Response.json({ ok: true, followUp: data }, { status: 200 });
    },
  });
}