import { NextResponse } from "next/server";
import { requireOpsAuth } from "@/lib/auth/opsAuth";
import { withCompatTelemetry } from "@/lib/compat/withCompatTelemetry";
import { getSupabaseAdminRuntimeClient } from "@/lib/runtime/supabase.runtime";

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
        user_id: gate.gate.canon.userIdUuid,
        name: body.title ?? "",
        person_name: null,
        description: body.body ?? "", // Mapping body to description assuming follow_ups uses description? Wait, check error log.
        due_date: body.dueAt ?? null,
        status: body.status ?? "open",
        type: "general",
        priority: "medium",
        metadata: body.meta ?? {},
      };

      const { data, error } = await getSupabaseAdminRuntimeClient()
        .from("follow_ups")
        .insert(payload)
        .select("*")
        .single();

      if (error) throw error;
      return Response.json({ ok: true, followUp: data }, { status: 200 });
    },
  });
}