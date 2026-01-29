// app/api/omega/outcomes/route.ts
// Record and view outcomes

export const dynamic = "force-dynamic";

import { requireOpsAuth } from "@/lib/auth/opsAuth";
import { withCompatTelemetry } from "@/lib/compat/withCompatTelemetry";
import { getSupabaseAdminRuntimeClient } from "@/lib/runtime/supabase.runtime";
import { executeOmegaPrompt } from "@/lib/omega/llm";
import { OMEGA_PROMPTS } from "@/lib/omega/prompts";

export async function GET(req: Request) {
  const gate = await requireOpsAuth();
  if (!gate.ok || !gate.canon) return Response.json(gate, { status: gate.status });

  return withCompatTelemetry({
    req: req as any,
    userIdUuid: gate.canon.userIdUuid,
    clerkUserId: gate.canon.clerkUserId,
    eventName: "api.omega.outcomes.get",
    handler: async () => {
      const url = new URL(req.url);
      const outcomeType = url.searchParams.get("type");
      const limit = parseInt(url.searchParams.get("limit") || "50");

      const supabase = getSupabaseAdminRuntimeClient();

      let query = supabase
        .from("pulse_outcomes")
        .select("*, draft:pulse_drafts(*)")
        .eq("user_id", gate.canon.clerkUserId)
        .order("created_at", { ascending: false })
        .limit(limit);

      if (outcomeType) {
        query = query.eq("outcome_type", outcomeType);
      }

      const { data, error } = await query;

      if (error) throw error;

      const outcomes = (data || []).map((o: any) => ({
        id: o.id,
        draftId: o.draft_id,
        outcomeType: o.outcome_type,
        outcomeSignal: o.outcome_signal,
        userRating: o.user_rating,
        userNotes: o.user_notes,
        measuredAt: o.measured_at,
        createdAt: o.created_at,
        draft: o.draft
          ? {
              id: o.draft.id,
              title: o.draft.title,
              draftType: o.draft.draft_type,
              confidence: o.draft.confidence,
            }
          : null,
      }));

      // Compute stats
      const stats = {
        total: outcomes.length,
        success: outcomes.filter((o: any) => o.outcomeType === "success").length,
        partial: outcomes.filter((o: any) => o.outcomeType === "partial").length,
        failure: outcomes.filter((o: any) => o.outcomeType === "failure").length,
        avgRating:
          outcomes.filter((o: any) => o.userRating).length > 0
            ? outcomes
                .filter((o: any) => o.userRating)
                .reduce((sum: number, o: any) => sum + o.userRating, 0) /
              outcomes.filter((o: any) => o.userRating).length
            : null,
      };

      return Response.json({ ok: true, outcomes, stats });
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
    eventName: "api.omega.outcomes.post",
    handler: async () => {
      const body = await req.json();
      const { draftId, outcomeType, outcomeSignal, userRating, userNotes, triggerLearning = true } = body;

      if (!draftId || !outcomeType) {
        return Response.json(
          { ok: false, error: "Missing required fields: draftId, outcomeType" },
          { status: 400 }
        );
      }

      const supabase = getSupabaseAdminRuntimeClient();

      // Record outcome
      const { data: outcome, error: outcomeError } = await supabase
        .from("pulse_outcomes")
        .insert({
          user_id: gate.canon.clerkUserId,
          draft_id: draftId,
          outcome_type: outcomeType,
          outcome_signal: outcomeSignal || {},
          user_rating: userRating,
          user_notes: userNotes,
        })
        .select("*, draft:pulse_drafts(*)")
        .single();

      if (outcomeError) throw outcomeError;

      // Trigger learning if enabled
      let learningResult = null;
      if (triggerLearning && outcome) {
        try {
          // Get existing strategies
          const { data: strategies } = await supabase
            .from("pulse_strategies")
            .select("*")
            .eq("user_id", gate.canon.clerkUserId)
            .eq("active", true);

          // Use LLM to extract learnings
          learningResult = await executeOmegaPrompt<{
            strategy_updates: any[];
            preference_inferences: any[];
            key_learnings: string[];
          }>(OMEGA_PROMPTS.LEARN_FROM_OUTCOME, {
            draft: outcome.draft,
            outcome: {
              type: outcomeType,
              rating: userRating,
              signal: outcomeSignal,
            },
            feedback: userNotes,
            strategies: (strategies || []).map((s: any) => ({
              id: s.id,
              type: s.strategy_type,
              pattern: s.pattern,
              confidence: s.confidence,
            })),
          });

          // Apply strategy updates
          for (const update of learningResult.strategy_updates || []) {
            if (update.action === "create") {
              await supabase.from("pulse_strategies").insert({
                user_id: gate.canon.clerkUserId,
                strategy_type: update.strategy_type,
                pattern: update.pattern,
                confidence: 0.5 + (update.confidence_delta || 0),
                active: true,
                learned_from: [outcome.id],
              });
            } else if (update.action === "update" && update.strategy_id) {
              const { data: existing } = await supabase
                .from("pulse_strategies")
                .select("confidence, success_count, failure_count, learned_from")
                .eq("id", update.strategy_id)
                .single();

              if (existing) {
                const newConfidence = Math.max(
                  0,
                  Math.min(1, existing.confidence + (update.confidence_delta || 0))
                );
                await supabase
                  .from("pulse_strategies")
                  .update({
                    confidence: newConfidence,
                    success_count:
                      outcomeType === "success"
                        ? existing.success_count + 1
                        : existing.success_count,
                    failure_count:
                      outcomeType === "failure"
                        ? existing.failure_count + 1
                        : existing.failure_count,
                    learned_from: [...(existing.learned_from || []), outcome.id],
                    updated_at: new Date().toISOString(),
                  })
                  .eq("id", update.strategy_id);
              }
            }
          }

          // Apply preference inferences
          for (const pref of learningResult.preference_inferences || []) {
            await supabase
              .from("pulse_preferences")
              .upsert(
                {
                  user_id: gate.canon.clerkUserId,
                  preference_type: pref.preference_type,
                  preference_value: pref.inferred_value,
                  confidence: pref.confidence,
                  evidence_count: 1,
                  updated_at: new Date().toISOString(),
                },
                { onConflict: "user_id,preference_type" }
              );
          }
        } catch (learningError) {
          console.error("Learning from outcome failed:", learningError);
          // Don't fail the whole request if learning fails
        }
      }

      return Response.json({
        ok: true,
        outcome: {
          id: outcome.id,
          outcomeType: outcome.outcome_type,
          userRating: outcome.user_rating,
        },
        learning: learningResult
          ? {
              strategiesUpdated: learningResult.strategy_updates?.length || 0,
              preferencesInferred: learningResult.preference_inferences?.length || 0,
              keyLearnings: learningResult.key_learnings,
            }
          : null,
      });
    },
  });
}
