// app/api/omega/signal/route.ts
// Ingest new signals and trigger Omega processing via Temporal + LangGraph

// Force Node.js runtime - required for SUPABASE_SERVICE_ROLE_KEY usage
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { requireOpsAuth } from "@/lib/auth/opsAuth";
import { withCompatTelemetry } from "@/lib/compat/withCompatTelemetry";
import { getSupabaseAdminRuntimeClient } from "@/lib/runtime/supabase.runtime";
import { processSignalWithOmega } from "@/lib/langgraph";
import { traceEnvSnapshot } from "@/lib/langgraph/tracing";
import { temporalClient, getOmegaTaskQueue, signalWorkflowId } from "@/lib/temporal/client";
import type { SignalSource, SignalType } from "@/lib/omega/types";

// Check if Temporal is enabled
const TEMPORAL_ENABLED = process.env.TEMPORAL_ENABLED === "true";

export async function POST(req: Request) {
  const gate = await requireOpsAuth();
  if (!gate.ok || !gate.canon) return Response.json(gate, { status: gate.status });

  // Log LangSmith trace configuration for debugging
  console.log("[Omega] LangSmith trace env:", traceEnvSnapshot());
  console.log("[Omega] Temporal enabled:", TEMPORAL_ENABLED);

  return withCompatTelemetry({
    req: req as Parameters<typeof withCompatTelemetry>[0]["req"],
    userIdUuid: gate.canon.userIdUuid,
    clerkUserId: gate.canon.clerkUserId,
    eventName: "api.omega.signal.post",
    handler: async () => {
      const body = await req.json();
      const {
        source,
        signalType,
        payload,
        metadata,
        process = true,
        useTemporal = TEMPORAL_ENABLED, // Allow per-request override
      } = body;

      if (!source || !signalType || !payload) {
        return Response.json(
          { ok: false, error: "Missing required fields: source, signalType, payload" },
          { status: 400 }
        );
      }

      const supabase = getSupabaseAdminRuntimeClient();

      // Insert signal
      const { data: signalData, error: signalError } = await supabase
        .from("pulse_signals")
        .insert({
          user_id: gate.canon.clerkUserId,
          source: source as SignalSource,
          signal_type: signalType as SignalType,
          payload,
          metadata: metadata || {},
          processed: false,
        })
        .select()
        .single();

      if (signalError) {
        throw new Error(`Failed to create signal: ${signalError.message}`);
      }

      const signal = {
        id: signalData.id,
        userId: signalData.user_id,
        source: signalData.source,
        signalType: signalData.signal_type,
        payload: signalData.payload,
        metadata: signalData.metadata,
        createdAt: signalData.created_at,
      };

      // If not processing, just return the signal
      if (!process) {
        return Response.json({ ok: true, signal });
      }

      // Gather user context for processing
      const [goalsResult, strategiesResult, preferencesResult, outcomesResult] = await Promise.all([
        supabase.from("pulse_goals").select("*").eq("user_id", gate.canon.clerkUserId).eq("status", "active").limit(10),
        supabase.from("pulse_strategies").select("*").eq("user_id", gate.canon.clerkUserId).eq("active", true).limit(10),
        supabase.from("pulse_preferences").select("*").eq("user_id", gate.canon.clerkUserId),
        supabase.from("pulse_outcomes").select("*").eq("user_id", gate.canon.clerkUserId).order("created_at", { ascending: false }).limit(20),
      ]);

      const userContext = {
        goals: goalsResult.data || [],
        strategies: strategiesResult.data || [],
        preferences: Object.fromEntries(
          (preferencesResult.data || []).map((p) => [p.preference_type, p.preference_value])
        ),
        recentOutcomes: outcomesResult.data || [],
      };

      // === TEMPORAL PATH: Durable async processing ===
      if (useTemporal) {
        try {
          const client = await temporalClient();
          const taskQueue = getOmegaTaskQueue();
          const workflowId = signalWorkflowId(signal.id);

          // Import workflow dynamically to avoid bundling issues
          const { omegaSignalWorkflow } = await import("@/lib/temporal/workflows/omegaSignal.workflow");

          const handle = await client.workflow.start(omegaSignalWorkflow, {
            taskQueue,
            workflowId,
            args: [
              {
                signal: {
                  id: signal.id,
                  userId: gate.canon.clerkUserId,
                  source: signal.source,
                  signalType: signal.signalType,
                  payload: signal.payload,
                  metadata: signal.metadata,
                  createdAt: signal.createdAt,
                },
                userId: gate.canon.clerkUserId,
                userContext,
              },
            ],
          });

          // Record workflow start in omega_runs
          await supabase.from("pulse_omega_runs").insert({
            user_id: gate.canon.clerkUserId,
            session_id: crypto.randomUUID(), // Placeholder, will be updated by workflow
            started_at: new Date().toISOString(),
            workflow_id: handle.workflowId,
            run_id: handle.firstExecutionRunId,
            status: "running",
          });

          // Return immediately - workflow runs in background
          return Response.json({
            ok: true,
            signal,
            workflow: {
              workflowId: handle.workflowId,
              runId: handle.firstExecutionRunId,
              taskQueue,
              status: "started",
            },
            async: true,
          });
        } catch (temporalError) {
          console.error("[Omega] Temporal workflow start failed, falling back to sync:", temporalError);
          // Fall through to sync processing
        }
      }

      // === SYNC PATH: Direct LangGraph processing ===
      const result = await processSignalWithOmega(signal, gate.canon.clerkUserId, userContext);

      // Mark signal as processed
      await supabase
        .from("pulse_signals")
        .update({
          processed: true,
          processed_at: new Date().toISOString(),
        })
        .eq("id", signal.id);

      // Save intent and draft if created
      if (result.intent) {
        const { data: savedIntent } = await supabase
          .from("pulse_intents")
          .insert({
            user_id: gate.canon.clerkUserId,
            signal_id: signal.id,
            predicted_need: result.intent.predictedNeed,
            confidence: result.intent.confidence,
            reasoning: result.intent.reasoning,
            suggested_action: result.intent.suggestedAction,
            status: "acted",
          })
          .select()
          .single();

        if (result.draft && savedIntent) {
          await supabase.from("pulse_drafts").insert({
            user_id: gate.canon.clerkUserId,
            intent_id: savedIntent.id,
            draft_type: result.draft.draftType,
            title: result.draft.title,
            content: result.draft.content,
            confidence: result.draft.confidence,
            status: result.shouldAutoExecute ? "auto_executed" : "pending_review",
            executed_at: result.shouldAutoExecute ? new Date().toISOString() : null,
          });
        }
      }

      return Response.json({
        ok: true,
        signal,
        result: {
          sessionId: result.sessionId,
          intent: result.intent,
          draft: result.draft,
          approved: result.approved,
          autoExecuted: result.shouldAutoExecute,
          guardianReview: result.guardianReview,
          observations: result.observations.length,
          cognitiveIssues: result.cognitiveIssues.length,
          improvements: result.proposedImprovements.length,
          reasoningSteps: result.reasoningTrace.length,
          totalDurationMs: result.reasoningTrace.reduce((sum, s) => sum + s.durationMs, 0),
          errors: result.errors,
        },
        async: false,
      });
    },
  });
}

export async function GET(req: Request) {
  const gate = await requireOpsAuth();
  if (!gate.ok || !gate.canon) return Response.json(gate, { status: gate.status });

  return withCompatTelemetry({
    req: req as Parameters<typeof withCompatTelemetry>[0]["req"],
    userIdUuid: gate.canon.userIdUuid,
    clerkUserId: gate.canon.clerkUserId,
    eventName: "api.omega.signal.get",
    handler: async () => {
      const url = new URL(req.url);
      const processed = url.searchParams.get("processed");
      const limit = parseInt(url.searchParams.get("limit") || "50");

      const supabase = getSupabaseAdminRuntimeClient();

      let query = supabase
        .from("pulse_signals")
        .select("*")
        .eq("user_id", gate.canon.clerkUserId)
        .order("created_at", { ascending: false })
        .limit(limit);

      if (processed !== null) {
        query = query.eq("processed", processed === "true");
      }

      const { data, error } = await query;

      if (error) throw error;

      return Response.json({ ok: true, signals: data || [] });
    },
  });
}
