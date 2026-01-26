// app/api/omega/reasoning/route.ts
// View reasoning traces

import { requireOpsAuth } from "@/lib/auth/opsAuth";
import { withCompatTelemetry } from "@/lib/compat/withCompatTelemetry";
import { getSupabaseAdminRuntimeClient } from "@/lib/runtime/supabase.runtime";

export async function GET(req: Request) {
  const gate = await requireOpsAuth();
  if (!gate.ok || !gate.canon) return Response.json(gate, { status: gate.status });

  return withCompatTelemetry({
    req: req as any,
    userIdUuid: gate.canon.userIdUuid,
    clerkUserId: gate.canon.clerkUserId,
    eventName: "api.omega.reasoning.get",
    handler: async () => {
      const url = new URL(req.url);
      const sessionId = url.searchParams.get("sessionId");
      const traceType = url.searchParams.get("type");
      const successOnly = url.searchParams.get("success") === "true";
      const limit = parseInt(url.searchParams.get("limit") || "50");

      const supabase = getSupabaseAdminRuntimeClient();

      let query = supabase
        .from("pulse_reasoning_traces")
        .select("*")
        .eq("user_id", gate.canon.clerkUserId)
        .order("created_at", { ascending: false })
        .limit(limit);

      if (sessionId) {
        query = query.eq("session_id", sessionId);
      }

      if (traceType) {
        query = query.eq("trace_type", traceType);
      }

      if (successOnly) {
        query = query.eq("success", true);
      }

      const { data, error } = await query;

      if (error) throw error;

      const traces = (data || []).map((t: any) => ({
        id: t.id,
        sessionId: t.session_id,
        traceType: t.trace_type,
        inputContext: t.input_context,
        reasoningSteps: t.reasoning_steps,
        output: t.output,
        durationMs: t.duration_ms,
        success: t.success,
        failureReason: t.failure_reason,
        createdAt: t.created_at,
      }));

      // Group by session if sessionId not specified
      let groupedTraces = traces;
      if (!sessionId) {
        const sessions: Record<string, any[]> = {};
        for (const trace of traces) {
          const sid = trace.sessionId || "no_session";
          if (!sessions[sid]) sessions[sid] = [];
          sessions[sid].push(trace);
        }
        groupedTraces = Object.entries(sessions).map(([sid, sessionTraces]) => ({
          sessionId: sid,
          traces: sessionTraces,
          totalDurationMs: sessionTraces.reduce((sum, t) => sum + (t.durationMs || 0), 0),
          allSuccessful: sessionTraces.every((t) => t.success !== false),
        }));
      }

      return Response.json({ ok: true, traces: groupedTraces, grouped: !sessionId });
    },
  });
}
