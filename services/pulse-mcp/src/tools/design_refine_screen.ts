// tools/design_refine_screen.ts
// Design conversation: refine an existing screen proposal via natural language.
// Loads the parent proposal, parses feedback into refinement intents,
// applies changes to a copy, generates a diff, shapes through personhood.
// Canon: never throw, return structured status, never mutate the parent.

import crypto from "node:crypto";
import { z } from "zod";
import { getSupabase } from "../supabase.js";
import { buildContext, shape } from "../personhood/index.js";

// ============================================
// INPUT SCHEMA
// ============================================

const inputSchema = z.object({
  proposal_id: z.string().uuid(),
  feedback: z.string().min(1),
});

// ============================================
// REFINEMENT INTENTS
// ============================================

type RefinementIntent =
  | "reduce_density"
  | "simplify_layout"
  | "explain_component"
  | "explain_rationale"
  | "explain_change"
  | "remove_component"
  | "tone_shift"
  | "prioritize_actions";

interface ParsedRefinement {
  intent: RefinementIntent;
  target?: string; // component name or keyword extracted from feedback
}

const INTENT_PATTERNS: Array<{
  patterns: RegExp[];
  intent: RefinementIntent;
  extractTarget?: boolean;
}> = [
  {
    patterns: [
      /too busy/i,
      /too crowded/i,
      /too cluttered/i,
      /too much/i,
      /too dense/i,
      /overwhelming/i,
    ],
    intent: "reduce_density",
  },
  {
    patterns: [
      /simpler/i,
      /simple/i,
      /minimal/i,
      /\bless\b/i,
      /strip (it )?back/i,
      /lean(er)?/i,
      /cleaner/i,
    ],
    intent: "simplify_layout",
  },
  {
    patterns: [
      /why did (.+?) change/i,
      /what changed/i,
      /why (was|were) (.+?) (changed|modified|updated)/i,
      /what('s| is) different/i,
      /show me the diff/i,
    ],
    intent: "explain_change",
  },
  {
    patterns: [
      /^why this screen/i,
      /^why this layout/i,
      /why (was )?(this )?(screen|layout|design) (designed|built|created|proposed|chosen)/i,
      /what('s| is) the rationale/i,
      /why (did you |was this )(propose|design|build|choose)/i,
    ],
    intent: "explain_rationale",
  },
  {
    patterns: [
      /why is (.+?) (here|there|shown|visible|included|prominent)/i,
      /why does (.+?) (exist|appear|show)/i,
      /explain (.+)/i,
      /what('s| is) (.+?) for/i,
    ],
    intent: "explain_component",
    extractTarget: true,
  },
  {
    patterns: [
      /don't care about (.+)/i,
      /remove (.+)/i,
      /drop (.+)/i,
      /get rid of (.+)/i,
      /hide (.+)/i,
      /don't need (.+)/i,
      /don't want (.+)/i,
    ],
    intent: "remove_component",
    extractTarget: true,
  },
  {
    patterns: [
      /calmer/i,
      /\bcalm\b/i,
      /quieter/i,
      /softer/i,
      /gentler/i,
      /more relaxed/i,
      /less aggressive/i,
    ],
    intent: "tone_shift",
  },
  {
    patterns: [
      /focus on actions/i,
      /actionable/i,
      /what can I do/i,
      /show me what to do/i,
      /action.?oriented/i,
      /prioritize actions/i,
    ],
    intent: "prioritize_actions",
  },
];

function parseRefinement(feedback: string): ParsedRefinement | null {
  for (const { patterns, intent, extractTarget } of INTENT_PATTERNS) {
    for (const pattern of patterns) {
      const match = pattern.exec(feedback);
      if (match) {
        let target: string | undefined;
        if (extractTarget) {
          // Extract the captured group (usually the component reference)
          const captured =
            match[1] && match[1].length < 60 ? match[1].trim() : undefined;
          target = captured;
        }
        return { intent, target };
      }
    }
  }
  return null;
}

// ============================================
// PROPOSAL LOADING
// ============================================

interface LoadedProposal {
  id: string;
  user_id: string;
  inputs: Record<string, unknown>;
  intent: string;
  status: string;
}

async function loadProposal(
  proposalId: string,
): Promise<LoadedProposal | null> {
  try {
    const { data } = await getSupabase()
      .from("pulse_proposals")
      .select("id, user_id, inputs, intent, status")
      .eq("id", proposalId)
      .maybeSingle();
    return data as LoadedProposal | null;
  } catch {
    return null;
  }
}

// ============================================
// TEMPORAL DEEPENING (Phase B)
// ============================================

interface TemporalHistory {
  first_seen_at: string | null;
  times_viewed: number;
  last_refined_at: string | null;
}

async function getTemporalHistory(
  userId: string,
  screenName: string,
): Promise<TemporalHistory> {
  const sb = getSupabase();

  try {
    const [viewEvents, refineEvents] = await Promise.all([
      sb
        .from("pulse_observer_events")
        .select("created_at")
        .eq("user_id", userId)
        .eq("event_type", "design_proposal_presented")
        .order("created_at", { ascending: true })
        .limit(100)
        .then((r) => r.data ?? []),
      sb
        .from("pulse_observer_events")
        .select("created_at")
        .eq("user_id", userId)
        .eq("event_type", "design_proposal_refined")
        .order("created_at", { ascending: false })
        .limit(1)
        .then((r) => r.data ?? []),
    ]);

    return {
      first_seen_at:
        viewEvents.length > 0
          ? (viewEvents[0] as any).created_at
          : null,
      times_viewed: viewEvents.length,
      last_refined_at:
        refineEvents.length > 0
          ? (refineEvents[0] as any).created_at
          : null,
    };
  } catch {
    return { first_seen_at: null, times_viewed: 0, last_refined_at: null };
  }
}

// ============================================
// REFINEMENT APPLICATION
// ============================================

interface RefinementDiff {
  components_removed?: string[];
  components_added?: string[];
  density_change?: "lower" | "same" | "higher";
  tone_change?: string;
}

function applyRefinement(
  proposal: Record<string, unknown>,
  refinement: ParsedRefinement,
): { refined: Record<string, unknown>; diff: RefinementDiff } {
  const refined = JSON.parse(JSON.stringify(proposal)) as Record<
    string,
    unknown
  >;
  const diff: RefinementDiff = {};

  const components = (refined.components ?? []) as Array<{
    name: string;
    priority: string;
    [k: string]: unknown;
  }>;

  switch (refinement.intent) {
    case "reduce_density": {
      // Remove tertiary components
      const removed = components.filter((c) => c.priority === "tertiary");
      if (removed.length > 0) {
        refined.components = components.filter(
          (c) => c.priority !== "tertiary",
        );
        diff.components_removed = removed.map((c) => c.name);
        diff.density_change = "lower";
      } else {
        // Demote secondary to tertiary (effectively hiding them)
        const secondary = components.filter(
          (c) => c.priority === "secondary",
        );
        if (secondary.length > 0) {
          for (const c of components) {
            if (c.priority === "secondary") c.priority = "tertiary";
          }
          refined.components = components.filter(
            (c) => c.priority !== "tertiary",
          );
          diff.components_removed = secondary.map((c) => c.name);
          diff.density_change = "lower";
        }
      }
      break;
    }

    case "simplify_layout": {
      // Keep only primary components
      const removed = components.filter((c) => c.priority !== "primary");
      if (removed.length > 0) {
        refined.components = components.filter(
          (c) => c.priority === "primary",
        );
        diff.components_removed = removed.map((c) => c.name);
        diff.density_change = "lower";
      }

      // Simplify layout to single column
      const layout = refined.layout as Record<string, unknown> | undefined;
      if (layout) {
        layout.type = "single_column_scroll";
        layout.columns = { desktop: 1, tablet: 1, mobile: 1 };
      }
      break;
    }

    case "remove_component": {
      if (refinement.target) {
        const targetLower = refinement.target.toLowerCase();
        const toRemove = components.filter((c) => {
          const nameLower = c.name.toLowerCase();
          // Match by exact name, or by humanized version
          const humanized = c.name
            .replace(/([A-Z])/g, " $1")
            .trim()
            .toLowerCase();
          return (
            nameLower.includes(targetLower) ||
            humanized.includes(targetLower) ||
            targetLower.includes(nameLower) ||
            targetLower.includes(humanized)
          );
        });

        if (toRemove.length > 0) {
          refined.components = components.filter(
            (c) => !toRemove.includes(c),
          );
          diff.components_removed = toRemove.map((c) => c.name);
        }
      }
      break;
    }

    case "tone_shift": {
      // Shift tone to calm
      refined.tone_guidelines = [
        "Use soft language — suggest, not demand",
        "Muted color palette; avoid red unless critical",
        "Generous whitespace; nothing should feel crowded",
        "Animations should be subtle and slow (300ms+)",
      ];
      diff.tone_change = "calm";
      break;
    }

    case "prioritize_actions": {
      // Promote components with interactions to primary
      for (const c of components) {
        const interactions = c.interactions as string[] | undefined;
        if (interactions && interactions.length > 1) {
          c.priority = "primary";
        }
      }
      // Demote components without interactions
      for (const c of components) {
        const interactions = c.interactions as string[] | undefined;
        if (!interactions || interactions.length === 0) {
          if (c.priority === "primary") c.priority = "secondary";
        }
      }
      refined.components = components;
      diff.density_change = "same";
      break;
    }

    case "explain_component":
    case "explain_rationale":
    case "explain_change":
      // No mutation — explanation only
      break;
  }

  return { refined, diff };
}

// ============================================
// EXPLANATION GENERATION
// ============================================

function explainComponent(
  components: Array<{ name: string; [k: string]: unknown }>,
  target: string | undefined,
  proposal: Record<string, unknown>,
): string {
  if (!target) {
    return "Which component do you want me to explain?";
  }

  const targetLower = target.toLowerCase();
  const comp = components.find((c) => {
    const nameLower = c.name.toLowerCase();
    const humanized = c.name
      .replace(/([A-Z])/g, " $1")
      .trim()
      .toLowerCase();
    return (
      nameLower.includes(targetLower) ||
      humanized.includes(targetLower) ||
      targetLower.includes(nameLower) ||
      targetLower.includes(humanized)
    );
  });

  if (!comp) {
    return `No component matching "${target}" in this proposal.`;
  }

  const humanName = comp.name
    .replace(/([A-Z])/g, " $1")
    .trim()
    .toLowerCase();
  const parts: string[] = [];
  parts.push(
    `${humanName} is a ${comp.priority ?? "standard"} component.`,
  );
  if (comp.data_source) {
    parts.push(`It pulls data from ${comp.data_source}.`);
  }
  if (comp.message) {
    parts.push(`Current state: ${comp.message}`);
  }
  if (comp.empty_state) {
    parts.push(`When empty: "${comp.empty_state}"`);
  }

  // Cite rationale from the proposal (C3: rationale dialogue)
  const rationale = proposal.rationale as Record<string, unknown> | undefined;
  if (rationale?.why_these_components) {
    parts.push(`Rationale: ${rationale.why_these_components}`);
  }

  // Cite signal severity context
  const explanation = proposal.explanation as Record<string, unknown> | undefined;
  if (explanation?.why_now) {
    parts.push(`Context: ${explanation.why_now}`);
  }

  return parts.join(" ");
}

/**
 * C3: Explain overall screen rationale — why this screen exists,
 * why this layout, what signals influenced it.
 */
function explainRationale(proposal: Record<string, unknown>): string {
  const parts: string[] = [];

  const rationale = proposal.rationale as Record<string, unknown> | undefined;
  const explanation = proposal.explanation as Record<string, unknown> | undefined;

  if (explanation?.why_this_screen_exists) {
    parts.push(String(explanation.why_this_screen_exists));
  }
  if (explanation?.why_now) {
    parts.push(String(explanation.why_now));
  }
  if (rationale?.why_this_layout) {
    parts.push(`Layout: ${rationale.why_this_layout}`);
  }
  if (rationale?.why_these_components) {
    parts.push(`Components: ${rationale.why_these_components}`);
  }

  const contextConsidered = rationale?.user_context_considered as string[] | undefined;
  if (contextConsidered && contextConsidered.length > 0) {
    parts.push(`Considered: ${contextConsidered.join("; ")}.`);
  }

  const alternatives = rationale?.alternatives_rejected as Array<{ option: string; reason: string }> | undefined;
  if (alternatives && alternatives.length > 0) {
    const altText = alternatives
      .map((a) => `${a.option} (rejected: ${a.reason})`)
      .join("; ");
    parts.push(`Alternatives rejected: ${altText}.`);
  }

  return parts.length > 0 ? parts.join(" ") : "No rationale recorded for this proposal.";
}

/**
 * C3: Explain what changed between versions — cite prior refinements.
 */
async function explainChange(
  userId: string,
  parentInputs: Record<string, unknown>,
): Promise<string> {
  const parts: string[] = [];

  // Check if this is a refinement
  const parentProposalId = parentInputs.parent_proposal_id as string | undefined;
  const refinementType = parentInputs.refinement_type as string | undefined;
  const version = parentInputs.version as number | undefined;
  const diff = parentInputs.diff as Record<string, unknown> | undefined;
  const refinementSummary = parentInputs.refinement_summary as string | undefined;

  if (refinementType) {
    parts.push(`This is version ${version ?? "?"}, a ${refinementType} refinement.`);
  }

  if (refinementSummary) {
    parts.push(refinementSummary);
  }

  if (diff) {
    const removed = diff.components_removed as string[] | undefined;
    const added = diff.components_added as string[] | undefined;
    const toneChange = diff.tone_change as string | undefined;

    if (removed && removed.length > 0) {
      parts.push(`Removed: ${removed.join(", ")}.`);
    }
    if (added && added.length > 0) {
      parts.push(`Added: ${added.join(", ")}.`);
    }
    if (toneChange) {
      parts.push(`Tone shifted to ${toneChange}.`);
    }
  }

  // Look at prior refinements in the chain
  if (parentProposalId) {
    try {
      const { data } = await getSupabase()
        .from("pulse_observer_events")
        .select("payload, created_at")
        .eq("user_id", userId)
        .eq("event_type", "design_proposal_refined")
        .order("created_at", { ascending: false })
        .limit(5);

      const priorRefinements = (data ?? []).filter((e: any) => {
        const payload = e.payload as Record<string, unknown>;
        return (
          payload.parent_id === parentProposalId ||
          payload.new_id === parentProposalId
        );
      });

      if (priorRefinements.length > 0) {
        parts.push(
          `${priorRefinements.length} prior refinement(s) in this chain.`,
        );
      }
    } catch {
      // Non-critical
    }
  }

  if (parts.length === 0) {
    parts.push("This is the initial version — no changes to explain.");
  }

  return parts.join(" ");
}

// ============================================
// CONVERSATIONAL RESPONSE BUILDER
// ============================================

function buildRefinementResponse(
  refinement: ParsedRefinement,
  diff: RefinementDiff,
  explanationText: string | null,
): string {
  if (refinement.intent === "explain_component") {
    return explanationText ?? "No explanation available.";
  }

  const lines: string[] = [];

  // Summary of what changed
  if (diff.components_removed && diff.components_removed.length > 0) {
    const names = diff.components_removed
      .map((n) =>
        n
          .replace(/([A-Z])/g, " $1")
          .trim()
          .toLowerCase(),
      )
      .join(", ");

    if (diff.components_removed.length === 1) {
      lines.push(`Removed ${names}.`);
    } else {
      lines.push(`Removed ${names}.`);
    }
  }

  if (diff.tone_change) {
    lines.push(`Shifted tone to ${diff.tone_change}.`);
  }

  if (diff.density_change === "lower") {
    lines.push("Less noise, same intent.");
  }

  if (lines.length === 0) {
    lines.push("Applied the refinement.");
  }

  // One follow-up question
  lines.push("Want it leaner, or is this the right balance?");

  return lines.join(" ");
}

// ============================================
// OBSERVER LOGGING
// ============================================

async function logRefineEvent(
  userId: string,
  kind: string,
  meta: Record<string, unknown>,
): Promise<void> {
  try {
    await getSupabase().from("pulse_observer_events").insert({
      user_id: userId,
      event_type: kind,
      payload: { ...meta, timestamp: new Date().toISOString() },
      created_at: new Date().toISOString(),
    });
  } catch {
    // Never fail the tool call if logging fails
  }
}

// ============================================
// MAIN FUNCTION
// ============================================

export async function refineScreen(input: unknown): Promise<{
  ok: boolean;
  proposal_id?: string;
  parent_proposal_id?: string;
  version?: number;
  diff?: RefinementDiff;
  refinement_type?: RefinementIntent;
  presented_text?: string;
  presented_meta?: {
    posture: string;
    familiarity: number;
    lint_violations: string[];
  };
  temporal_history?: TemporalHistory;
  error?: string;
}> {
  // 1. Validate input
  const parsed = inputSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.message };
  }

  const { proposal_id, feedback } = parsed.data;

  try {
    // 2. Load the parent proposal
    const parent = await loadProposal(proposal_id);
    if (!parent) {
      return { ok: false, error: `Proposal ${proposal_id} not found` };
    }

    const parentInputs = parent.inputs as Record<string, unknown>;
    const parentProposal = parentInputs?.proposal as Record<
      string,
      unknown
    > | null;
    if (!parentProposal) {
      return {
        ok: false,
        error: "Parent proposal has no design payload to refine",
      };
    }

    // 3. Parse feedback into refinement intent
    const refinement = parseRefinement(feedback);
    if (!refinement) {
      // Unrecognized feedback — ask one clarifying question
      let presentedText =
        "Not sure what to change. Could you be more specific — density, tone, or a specific component?";
      let presentedMeta:
        | {
            posture: string;
            familiarity: number;
            lint_violations: string[];
          }
        | undefined;

      try {
        const personCtx = await buildContext(parent.user_id, {
          autonomy_level: 0,
          trust_score: 0.5,
          proposal_type: "ui_screen",
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
        parent_proposal_id: proposal_id,
        refinement_type: undefined,
        presented_text: presentedText,
        presented_meta: presentedMeta,
      };
    }

    // 4. Handle explanation-only intents (no mutation, no new proposal)
    if (
      refinement.intent === "explain_component" ||
      refinement.intent === "explain_rationale" ||
      refinement.intent === "explain_change"
    ) {
      let explanationRaw: string;

      if (refinement.intent === "explain_component") {
        const components = (parentProposal.components ?? []) as Array<{
          name: string;
          [k: string]: unknown;
        }>;
        explanationRaw = explainComponent(
          components,
          refinement.target,
          parentProposal,
        );
      } else if (refinement.intent === "explain_rationale") {
        explanationRaw = explainRationale(parentProposal);
      } else {
        explanationRaw = await explainChange(parent.user_id, parentInputs);
      }

      let presentedText = explanationRaw;
      let presentedMeta:
        | {
            posture: string;
            familiarity: number;
            lint_violations: string[];
          }
        | undefined;

      try {
        const personCtx = await buildContext(parent.user_id, {
          autonomy_level: 0,
          trust_score: 0.5,
          proposal_type: "ui_screen",
          recent_interaction_type: "design",
        });
        const shaped = shape(explanationRaw, personCtx);
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
        parent_proposal_id: proposal_id,
        refinement_type: refinement.intent,
        presented_text: presentedText,
        presented_meta: presentedMeta,
      };
    }

    // 5. Apply refinement to a copy of the proposal
    const { refined, diff } = applyRefinement(parentProposal, refinement);

    // 6. Compute version number
    let version = 2; // default: first refinement
    const parentVersion = parentInputs?.version as number | undefined;
    if (parentVersion) {
      version = parentVersion + 1;
    }
    const parentParentId = parentInputs?.parent_proposal_id as
      | string
      | undefined;
    if (parentParentId) {
      // This is already a refined proposal — increment its version
      version = (parentVersion ?? 1) + 1;
    }

    // 7. Get temporal history
    const screenName = (refined.screen_name as string) ?? "unknown";
    const temporal = await getTemporalHistory(parent.user_id, screenName);

    // 8. Build conversational response
    const rawResponse = buildRefinementResponse(refinement, diff, null);

    // 9. Shape through personhood
    let presentedText = rawResponse;
    let presentedMeta:
      | {
          posture: string;
          familiarity: number;
          lint_violations: string[];
        }
      | undefined;

    try {
      const personCtx = await buildContext(parent.user_id, {
        autonomy_level: 0,
        trust_score: 0.5,
        proposal_type: "ui_screen",
        recent_interaction_type: "design",
      });
      const shaped = shape(rawResponse, personCtx);
      presentedText = shaped.text;
      presentedMeta = {
        posture: shaped.posture,
        familiarity: shaped.familiarity_level,
        lint_violations: shaped.lint_result.violations,
      };
    } catch {
      // Use raw text
    }

    // 10. Write new proposal linked to parent
    const callId = `refine-${crypto.randomUUID()}`;
    const { data, error } = await getSupabase()
      .from("pulse_proposals")
      .insert({
        call_id: callId,
        tool: "design.refine_screen",
        scope: "propose",
        agent: "design_intelligence",
        intent: feedback,
        inputs: {
          proposal_type: "ui_screen",
          parent_proposal_id: proposal_id,
          version,
          refinement_type: refinement.intent,
          refinement_summary: rawResponse,
          diff,
          proposal: refined,
          temporal_history: temporal,
        },
        status: "pending",
        verdict: "require_human",
        user_id: parent.user_id,
      })
      .select("id")
      .single();

    if (error) {
      return { ok: false, error: error.message };
    }

    // 11. Log observer event (non-blocking)
    logRefineEvent(parent.user_id, "design_proposal_refined", {
      parent_id: proposal_id,
      new_id: data.id,
      refinement_type: refinement.intent,
      version,
      components_removed: diff.components_removed ?? [],
      density_change: diff.density_change ?? "same",
      tone_change: diff.tone_change ?? null,
      posture: presentedMeta?.posture ?? null,
      familiarity: presentedMeta?.familiarity ?? null,
      lint_violation_count: presentedMeta?.lint_violations.length ?? 0,
    }).catch(() => {});

    return {
      ok: true,
      proposal_id: data.id,
      parent_proposal_id: proposal_id,
      version,
      diff,
      refinement_type: refinement.intent,
      presented_text: presentedText,
      presented_meta: presentedMeta,
      temporal_history: temporal,
    };
  } catch (e: any) {
    return {
      ok: false,
      error: e?.message ?? "Unknown error refining proposal",
    };
  }
}
