// tools/persona_shape.ts
// MCP tool: persona.shape
// Shapes raw text or proposals through the Conversational Personhood pipeline.
// Returns shaped output with posture, familiarity, and lint metadata.
// Canon: never throw, return structured status.

import { z } from "zod";
import { getSupabase } from "../supabase.js";
import { buildContext, shape, shapeProposal } from "../personhood/index.js";

const inputSchema = z.object({
  target_user_id: z.string().min(10),
  text: z.string().min(1).optional(),
  proposal_id: z.string().uuid().optional(),
  context_hint: z.string().optional(),
  proposal_type: z.string().optional(),
  signal_severity: z
    .enum(["none", "low", "medium", "high", "critical"])
    .optional(),
});

export async function personaShape(input: unknown): Promise<{
  ok: boolean;
  shaped_text?: string;
  posture?: string;
  familiarity_level?: number;
  question_count?: number;
  lint_violations?: string[];
  error?: string;
}> {
  const parsed = inputSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.message };
  }

  const {
    target_user_id,
    text,
    proposal_id,
    context_hint,
    proposal_type,
    signal_severity,
  } = parsed.data;

  if (!text && !proposal_id) {
    return { ok: false, error: "Either text or proposal_id is required" };
  }

  try {
    // Gather trust state for context building
    let trustData: { autonomy_level: number; trust_score: number } | null =
      null;
    try {
      const { data } = await getSupabase()
        .from("pulse_trust_state")
        .select("autonomy_level, trust_score")
        .eq("user_id", target_user_id)
        .maybeSingle();
      trustData = data;
    } catch {
      // Use defaults
    }

    const ctx = await buildContext(target_user_id, {
      autonomy_level: trustData?.autonomy_level ?? 0,
      trust_score: trustData?.trust_score ?? 0.5,
      proposal_type: proposal_type ?? undefined,
      signal_severity:
        (signal_severity as
          | "none"
          | "low"
          | "medium"
          | "high"
          | "critical") ?? undefined,
      recent_interaction_type: context_hint ?? undefined,
    });

    // If proposal_id provided, load and shape the proposal
    if (proposal_id) {
      const { data: proposal } = await getSupabase()
        .from("pulse_proposals")
        .select("inputs")
        .eq("id", proposal_id)
        .maybeSingle();

      if (!proposal) {
        return { ok: false, error: `Proposal ${proposal_id} not found` };
      }

      const proposalData = (proposal.inputs as any)?.proposal;
      if (!proposalData) {
        return {
          ok: false,
          error: "Proposal has no design payload to shape",
        };
      }

      const result = shapeProposal(proposalData, ctx);
      return {
        ok: true,
        shaped_text: result.text,
        posture: result.posture,
        familiarity_level: result.familiarity_level,
        question_count: result.question_count,
        lint_violations: result.lint_result.violations,
      };
    }

    // Shape raw text
    const result = shape(text!, ctx);
    return {
      ok: true,
      shaped_text: result.text,
      posture: result.posture,
      familiarity_level: result.familiarity_level,
      question_count: result.question_count,
      lint_violations: result.lint_result.violations,
    };
  } catch (e: any) {
    return { ok: false, error: e?.message ?? "Unknown error shaping text" };
  }
}
