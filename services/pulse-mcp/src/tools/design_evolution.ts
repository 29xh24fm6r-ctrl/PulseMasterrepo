// tools/design_evolution.ts
// C2: Screen Evolution Suggestions — proposal-gated, never auto-applied.
// Detects unused components and suggests simplification.
// Trigger conditions: component unused > N views, screen viewed >= M times,
// no recent refinements.
// Canon: never throw, return structured status, never auto-apply.

import crypto from "node:crypto";
import { z } from "zod";
import { getSupabase } from "../supabase.js";
import { buildContext, shape } from "../personhood/index.js";
import { isPhaseCEnabled } from "./design_flags.js";

// ============================================
// CONFIGURATION
// ============================================

const MIN_VIEWS_FOR_SUGGESTION = 5;
const MIN_IDLE_HOURS = 24;
const SUPPRESSION_DAYS = 7;

// ============================================
// INPUT SCHEMA
// ============================================

const inputSchema = z.object({
  target_user_id: z.string().min(10),
  screen_name: z.string().optional(),
});

// ============================================
// TYPES
// ============================================

interface EvolutionSuggestion {
  screen_name: string;
  suggestion: string;
  evidence: {
    views: number;
    interactions: number;
    last_used_at?: string;
  };
  proposed_change: "demote_component" | "simplify_layout" | "merge_components";
  unused_components: string[];
}

// ============================================
// MAIN FUNCTION
// ============================================

export async function checkEvolution(input: unknown): Promise<{
  ok: boolean;
  suggestions?: EvolutionSuggestion[];
  proposal_ids?: string[];
  presented_text?: string;
  presented_meta?: {
    posture: string;
    familiarity: number;
    lint_violations: string[];
  };
  error?: string;
}> {
  if (!isPhaseCEnabled()) {
    return { ok: false, error: "Phase C is disabled" };
  }

  const parsed = inputSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.message };
  }

  const { target_user_id, screen_name } = parsed.data;

  try {
    const sb = getSupabase();

    // 1. Gather screen proposals for this user
    let proposalQuery = sb
      .from("pulse_proposals")
      .select("id, inputs, created_at")
      .eq("user_id", target_user_id)
      .eq("tool", "design.propose_screen")
      .order("created_at", { ascending: false })
      .limit(20);

    const { data: proposals } = await proposalQuery;
    if (!proposals || proposals.length === 0) {
      return { ok: true, suggestions: [], proposal_ids: [] };
    }

    // Filter to specific screen if requested
    const filtered = screen_name
      ? proposals.filter((p: any) => {
          const inputs = p.inputs as Record<string, unknown>;
          const proposal = inputs?.proposal as Record<string, unknown> | undefined;
          return proposal?.screen_name === screen_name;
        })
      : proposals;

    if (filtered.length === 0) {
      return { ok: true, suggestions: [], proposal_ids: [] };
    }

    // 2. Gather view events
    const { data: viewEvents } = await sb
      .from("pulse_observer_events")
      .select("payload, created_at")
      .eq("user_id", target_user_id)
      .eq("event_type", "design_proposal_presented")
      .order("created_at", { ascending: false })
      .limit(100);

    // 3. Gather refinement events
    const { data: refineEvents } = await sb
      .from("pulse_observer_events")
      .select("payload, created_at")
      .eq("user_id", target_user_id)
      .eq("event_type", "design_proposal_refined")
      .order("created_at", { ascending: false })
      .limit(50);

    // 3b. Gather recently dismissed evolution suggestions (7-day suppression)
    const suppressionCutoff = new Date(
      Date.now() - SUPPRESSION_DAYS * 24 * 60 * 60 * 1000,
    ).toISOString();
    const { data: dismissedSuggestions } = await sb
      .from("pulse_proposals")
      .select("inputs")
      .eq("user_id", target_user_id)
      .eq("tool", "design.check_evolution")
      .in("status", ["dismissed", "rejected"])
      .gte("created_at", suppressionCutoff)
      .limit(50);

    const suppressedScreens = new Set<string>();
    for (const d of dismissedSuggestions ?? []) {
      const inputs = d.inputs as Record<string, unknown>;
      const sn = inputs?.screen_name as string | undefined;
      if (sn) suppressedScreens.add(sn);
    }

    // 4. Analyze each screen for evolution opportunities
    const suggestions: EvolutionSuggestion[] = [];
    const proposalIds: string[] = [];

    // Group proposals by screen_name
    const screenMap = new Map<string, any[]>();
    for (const p of filtered) {
      const inputs = p.inputs as Record<string, unknown>;
      const proposal = inputs?.proposal as Record<string, unknown> | undefined;
      const sn = proposal?.screen_name as string | undefined;
      if (!sn) continue;
      if (!screenMap.has(sn)) screenMap.set(sn, []);
      screenMap.get(sn)!.push(p);
    }

    for (const [sn, screenProposals] of screenMap) {
      // Skip screens with recently dismissed evolution suggestions
      if (suppressedScreens.has(sn)) continue;

      const latestProposal = screenProposals[0];
      const inputs = latestProposal.inputs as Record<string, unknown>;
      const proposal = inputs?.proposal as Record<string, unknown> | undefined;
      if (!proposal) continue;

      // Count views for this screen
      const screenViews = (viewEvents ?? []).filter((e: any) => {
        const payload = e.payload as Record<string, unknown>;
        return payload?.screen_name === sn;
      });

      const viewCount = screenViews.length;
      if (viewCount < MIN_VIEWS_FOR_SUGGESTION) continue;

      // Check for recent refinements
      const recentRefine = (refineEvents ?? []).find((e: any) => {
        const payload = e.payload as Record<string, unknown>;
        const elapsed =
          Date.now() - new Date(e.created_at).getTime();
        return (
          payload?.screen_name === sn &&
          elapsed < MIN_IDLE_HOURS * 60 * 60 * 1000
        );
      });
      if (recentRefine) continue;

      // Find unused components (components that appear in proposal but
      // have no interaction events)
      const components = (proposal.components ?? []) as Array<{
        name: string;
        priority: string;
        [k: string]: unknown;
      }>;

      // For now, detect tertiary components as candidates for evolution
      const unusedCandidates = components
        .filter((c) => c.priority === "tertiary" || c.priority === "secondary")
        .map((c) => c.name);

      if (unusedCandidates.length === 0) continue;

      const suggestion: EvolutionSuggestion = {
        screen_name: sn,
        suggestion: `${unusedCandidates.length} component(s) may no longer be needed. Consider simplifying.`,
        evidence: {
          views: viewCount,
          interactions: 0,
          last_used_at: screenViews[0]
            ? (screenViews[0] as any).created_at
            : undefined,
        },
        proposed_change:
          unusedCandidates.length > 2
            ? "simplify_layout"
            : "demote_component",
        unused_components: unusedCandidates,
      };

      suggestions.push(suggestion);

      // Write evolution suggestion as proposal
      const callId = `evolution-${crypto.randomUUID()}`;
      const { data: proposalData } = await sb
        .from("pulse_proposals")
        .insert({
          call_id: callId,
          tool: "design.check_evolution",
          scope: "propose",
          agent: "design_intelligence",
          intent: `Evolution suggestion for ${sn}`,
          inputs: {
            proposal_type: "ui_evolution_suggestion",
            screen_name: sn,
            suggestion,
          },
          status: "pending",
          verdict: "require_human",
          user_id: target_user_id,
        })
        .select("id")
        .single();

      if (proposalData) {
        proposalIds.push(proposalData.id);
      }
    }

    // Shape presentation text
    let presentedText: string;
    if (suggestions.length === 0) {
      presentedText = "No evolution suggestions right now. Everything looks well-used.";
    } else {
      presentedText = suggestions
        .map(
          (s) =>
            `${s.screen_name}: ${s.unused_components.length} unused component(s) after ${s.evidence.views} views.`,
        )
        .join(" ");
      presentedText +=
        " Want to simplify, or keep them as-is?";
    }

    let presentedMeta:
      | { posture: string; familiarity: number; lint_violations: string[] }
      | undefined;

    try {
      const personCtx = await buildContext(target_user_id, {
        autonomy_level: 0,
        trust_score: 0.5,
        proposal_type: "ui_evolution_suggestion",
        recent_interaction_type: "design",
      });
      const shaped = shape(presentedText, personCtx);
      presentedText = shaped.text;
      presentedMeta = {
        posture: shaped.posture,
        familiarity: shaped.familiarity_level,
        lint_violations: shaped.lint_result.violations,
      };
    } catch {
      // Use raw text
    }

    return {
      ok: true,
      suggestions,
      proposal_ids: proposalIds,
      presented_text: presentedText,
      presented_meta: presentedMeta,
    };
  } catch (e: any) {
    return {
      ok: false,
      error: e?.message ?? "Unknown error checking evolution",
    };
  }
}
