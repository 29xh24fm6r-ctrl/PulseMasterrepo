// app/api/omega/drafts/route.ts
// Manage Omega drafts - review queue

import { requireOpsAuth } from "@/lib/auth/opsAuth";
import { withCompatTelemetry } from "@/lib/compat/withCompatTelemetry";
import { getSupabaseAdminRuntimeClient } from "@/lib/runtime/supabase.runtime";
import { processFeedback } from "@/lib/omega";

export async function GET(req: Request) {
  const gate = await requireOpsAuth();
  if (!gate.ok || !gate.canon) return Response.json(gate, { status: gate.status });

  return withCompatTelemetry({
    req: req as any,
    userIdUuid: gate.canon.userIdUuid,
    clerkUserId: gate.canon.clerkUserId,
    eventName: "api.omega.drafts.get",
    handler: async () => {
      const url = new URL(req.url);
      const status = url.searchParams.get("status") || "pending_review";
      const limit = parseInt(url.searchParams.get("limit") || "20");

      const supabase = getSupabaseAdminRuntimeClient();

      const { data, error } = await supabase
        .from("pulse_drafts")
        .select(`
          *,
          intent:pulse_intents(
            *,
            signal:pulse_signals(*)
          )
        `)
        .eq("user_id", gate.canon.clerkUserId)
        .eq("status", status)
        .order("created_at", { ascending: false })
        .limit(limit);

      if (error) throw error;

      // Transform to UI-friendly format
      const drafts = (data || []).map((d: any) => ({
        id: d.id,
        title: d.title,
        draftType: d.draft_type,
        content: d.content,
        confidence: d.confidence,
        status: d.status,
        createdAt: d.created_at,
        intent: d.intent
          ? {
              id: d.intent.id,
              predictedNeed: d.intent.predicted_need,
              confidence: d.intent.confidence,
              urgency: d.intent.urgency,
              signal: d.intent.signal
                ? {
                    id: d.intent.signal.id,
                    source: d.intent.signal.source,
                    signalType: d.intent.signal.signal_type,
                    payload: d.intent.signal.payload,
                  }
                : null,
            }
          : null,
      }));

      return Response.json({ ok: true, drafts });
    },
  });
}

export async function POST(req: Request) {
  const gate = await requireOpsAuth();
  if (!gate.ok || !gate.canon) return Response.json(gate, { status: gate.status });

  return withCompatTelemetry({
    req: req as any,
    userIdUuid: gate.canon.userIdUuid,
    clerkUserId: gate.canon.clerkUserId,
    eventName: "api.omega.drafts.post",
    handler: async () => {
      const body = await req.json();
      const { draftId, action, feedback, editedContent } = body;

      if (!draftId || !action) {
        return Response.json(
          { ok: false, error: "Missing required fields: draftId, action" },
          { status: 400 }
        );
      }

      if (!["approve", "reject", "edit"].includes(action)) {
        return Response.json(
          { ok: false, error: "Invalid action. Must be: approve, reject, or edit" },
          { status: 400 }
        );
      }

      await processFeedback(
        draftId,
        gate.canon.clerkUserId,
        action,
        feedback,
        editedContent
      );

      return Response.json({ ok: true, action, draftId });
    },
  });
}
