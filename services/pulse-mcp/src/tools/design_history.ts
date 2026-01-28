// tools/design_history.ts
// C1: Interface Archaeology — read-only time machine for screen proposals.
// Reconstructs screen states from stored proposals and observer events.
// No mutation, no screenshots, read-only reconstruction only.
// Canon: never throw, return structured status, no retries.

import { z } from "zod";
import { getSupabase } from "../supabase.js";
import { buildContext, shape } from "../personhood/index.js";
import { isPhaseCEnabled } from "./design_flags.js";

// ============================================
// INPUT SCHEMA
// ============================================

const inputSchema = z.object({
  target_user_id: z.string().min(10).optional(),
  screen_name: z.string().optional(),
  from: z.string().optional(),
  to: z.string().optional(),
  proposal_id: z.string().uuid().optional(),
});

// ============================================
// TYPES
// ============================================

interface VersionEntry {
  proposal_id: string;
  created_at: string;
  summary: string;
  explanation: string;
  version?: number;
  parent_proposal_id?: string;
  refinement_type?: string;
}

interface VersionDiff {
  added: string[];
  removed: string[];
  changed: string[];
}

// ============================================
// HELPERS
// ============================================

function buildVersionSummary(inputs: Record<string, unknown>): string {
  const proposalType = (inputs?.proposal_type as string) ?? "unknown";
  const refinementType = inputs?.refinement_type as string | undefined;
  const version = inputs?.version as number | undefined;

  if (refinementType) {
    return `v${version ?? "?"}: ${refinementType} refinement`;
  }
  if (proposalType === "ui_absence") {
    return "Designed absence — nothing to show";
  }
  if (proposalType === "ui_predictive_draft") {
    return "Predictive draft (parked)";
  }

  const proposal = inputs?.proposal as Record<string, unknown> | undefined;
  const screenName = proposal?.screen_name as string | undefined;
  return screenName ? `Initial proposal: ${screenName}` : "Screen proposal";
}

function buildVersionExplanation(
  inputs: Record<string, unknown>,
  rationale?: Record<string, unknown> | null,
  explanation?: Record<string, unknown> | null,
): string {
  const parts: string[] = [];

  if (explanation) {
    if (explanation.why_this_screen_exists) {
      parts.push(String(explanation.why_this_screen_exists));
    }
    if (explanation.why_now) {
      parts.push(String(explanation.why_now));
    }
  }

  if (rationale) {
    if (rationale.why_this_layout) {
      parts.push(String(rationale.why_this_layout));
    }
  }

  const refinementSummary = inputs?.refinement_summary as string | undefined;
  if (refinementSummary) {
    parts.push(refinementSummary);
  }

  return parts.length > 0 ? parts.join(" ") : "No explanation available.";
}

function computeDiff(
  firstInputs: Record<string, unknown>,
  lastInputs: Record<string, unknown>,
): VersionDiff {
  const firstProposal = (firstInputs?.proposal ?? {}) as Record<string, unknown>;
  const lastProposal = (lastInputs?.proposal ?? {}) as Record<string, unknown>;

  const firstComponents = ((firstProposal.components ?? []) as any[]).map(
    (c: any) => c.name as string,
  );
  const lastComponents = ((lastProposal.components ?? []) as any[]).map(
    (c: any) => c.name as string,
  );

  const added = lastComponents.filter((n) => !firstComponents.includes(n));
  const removed = firstComponents.filter((n) => !lastComponents.includes(n));

  const changed: string[] = [];
  for (const name of lastComponents) {
    if (firstComponents.includes(name)) {
      const fc = ((firstProposal.components ?? []) as any[]).find(
        (c: any) => c.name === name,
      );
      const lc = ((lastProposal.components ?? []) as any[]).find(
        (c: any) => c.name === name,
      );
      if (fc && lc && fc.priority !== lc.priority) {
        changed.push(name);
      }
    }
  }

  return { added, removed, changed };
}

/**
 * Build a conversational narrative from version entries.
 * Instead of "3 versions, 1 added, 2 removed", this tells the story:
 * "Originally focused on visibility. Then density was reduced. Now prioritizes actions."
 */
function buildNarrative(
  versions: VersionEntry[],
  diff?: VersionDiff,
  screenName?: string,
): string {
  if (versions.length === 0) {
    return screenName
      ? `No history found for ${screenName}.`
      : "No history found.";
  }

  if (versions.length === 1) {
    const v = versions[0];
    const explanation = v.explanation !== "No explanation available."
      ? v.explanation
      : v.summary;
    return `This screen has one version. ${explanation}`;
  }

  const parts: string[] = [];

  // First version: "Originally..."
  const first = versions[0];
  if (first.explanation !== "No explanation available.") {
    parts.push(`Originally, ${first.explanation.charAt(0).toLowerCase()}${first.explanation.slice(1)}`);
  } else {
    parts.push(`Started as ${first.summary}.`);
  }

  // Middle refinements: "Then..." for each
  const refinements = versions.slice(1, -1);
  for (const v of refinements) {
    if (v.refinement_type) {
      const humanType = v.refinement_type.replace(/_/g, " ");
      parts.push(`Then ${humanType} was applied.`);
    }
  }

  // Latest version: "Current version..."
  const latest = versions[versions.length - 1];
  if (latest.refinement_type) {
    const humanType = latest.refinement_type.replace(/_/g, " ");
    parts.push(`Current version (v${latest.version ?? versions.length}) reflects ${humanType}.`);
  } else {
    parts.push(`Current version is v${latest.version ?? versions.length}.`);
  }

  // Diff summary if available
  if (diff) {
    const changes: string[] = [];
    if (diff.removed.length > 0) {
      const names = diff.removed
        .map((n) => n.replace(/([A-Z])/g, " $1").trim().toLowerCase())
        .join(", ");
      changes.push(`removed ${names}`);
    }
    if (diff.added.length > 0) {
      const names = diff.added
        .map((n) => n.replace(/([A-Z])/g, " $1").trim().toLowerCase())
        .join(", ");
      changes.push(`added ${names}`);
    }
    if (diff.changed.length > 0) {
      changes.push(`${diff.changed.length} component(s) changed priority`);
    }
    if (changes.length > 0) {
      parts.push(`Net changes: ${changes.join(", ")}.`);
    }
  }

  return parts.join(" ");
}

function toVersionEntry(p: any): VersionEntry {
  const inputs = p.inputs as Record<string, unknown>;
  const proposal = inputs?.proposal as Record<string, unknown> | undefined;
  const rationale = proposal?.rationale as Record<string, unknown> | undefined;
  const explanation = proposal?.explanation as Record<string, unknown> | undefined;

  return {
    proposal_id: p.id,
    created_at: p.created_at,
    summary: buildVersionSummary(inputs),
    explanation: buildVersionExplanation(inputs, rationale, explanation),
    version: (inputs?.version as number) ?? 1,
    parent_proposal_id: inputs?.parent_proposal_id as string | undefined,
    refinement_type: inputs?.refinement_type as string | undefined,
  };
}

// ============================================
// LINEAGE RECONSTRUCTION
// ============================================

async function fetchProposalLineage(
  sb: ReturnType<typeof getSupabase>,
  proposalId: string,
  targetUserId?: string,
): Promise<{
  ok: boolean;
  versions?: VersionEntry[];
  diff?: VersionDiff;
  presented_text?: string;
  presented_meta?: { posture: string; familiarity: number; lint_violations: string[] };
  error?: string;
}> {
  // Walk up the parent chain
  const chain: any[] = [];
  let currentId: string | null = proposalId;
  const visited = new Set<string>();

  while (currentId && !visited.has(currentId)) {
    visited.add(currentId);
    const { data } = await sb
      .from("pulse_proposals")
      .select("id, created_at, intent, inputs, status, user_id")
      .eq("id", currentId)
      .maybeSingle();

    if (!data) break;
    chain.unshift(data);
    const inputs = data.inputs as Record<string, unknown>;
    currentId = (inputs?.parent_proposal_id as string) ?? null;
  }

  // Walk down: find children of proposals in the chain
  const chainIds = chain.map((p) => p.id);
  const { data: children } = await sb
    .from("pulse_proposals")
    .select("id, created_at, intent, inputs, status")
    .eq("tool", "design.refine_screen")
    .order("created_at", { ascending: true })
    .limit(50);

  const childProposals = (children ?? []).filter((c: any) => {
    const inputs = c.inputs as Record<string, unknown>;
    return (
      chainIds.includes(inputs?.parent_proposal_id as string) &&
      !visited.has(c.id)
    );
  });

  const allProposals = [...chain, ...childProposals];
  const versions = allProposals.map(toVersionEntry);

  let diff: VersionDiff | undefined;
  if (allProposals.length >= 2) {
    diff = computeDiff(
      allProposals[0].inputs as Record<string, unknown>,
      allProposals[allProposals.length - 1].inputs as Record<string, unknown>,
    );
  }

  const userId = targetUserId ?? chain[0]?.user_id;
  let presentedText: string | undefined;
  let presentedMeta:
    | { posture: string; familiarity: number; lint_violations: string[] }
    | undefined;

  if (userId) {
    const rawText = buildNarrative(versions, diff);

    try {
      const personCtx = await buildContext(userId, {
        autonomy_level: 0,
        trust_score: 0.5,
        proposal_type: "ui_screen",
        recent_interaction_type: "design",
      });
      const shaped = shape(rawText, personCtx);
      presentedText = shaped.text;
      presentedMeta = {
        posture: shaped.posture,
        familiarity: shaped.familiarity_level,
        lint_violations: shaped.lint_result.violations,
      };
    } catch {
      presentedText = rawText;
    }
  }

  return { ok: true, versions, diff, presented_text: presentedText, presented_meta: presentedMeta };
}

// ============================================
// MAIN FUNCTION
// ============================================

export async function designHistory(input: unknown): Promise<{
  ok: boolean;
  versions?: VersionEntry[];
  diff?: VersionDiff;
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

  const { target_user_id, screen_name, from, to, proposal_id } = parsed.data;

  try {
    const sb = getSupabase();

    // If a specific proposal_id is given, fetch its lineage
    if (proposal_id) {
      return await fetchProposalLineage(sb, proposal_id, target_user_id);
    }

    // Otherwise, fetch by screen_name
    if (!screen_name) {
      return { ok: false, error: "Provide screen_name or proposal_id" };
    }

    // Query proposals for this screen
    let query = sb
      .from("pulse_proposals")
      .select("id, created_at, intent, inputs, status, user_id")
      .order("created_at", { ascending: true })
      .limit(100);

    if (target_user_id) {
      query = query.eq("user_id", target_user_id);
    }
    if (from) {
      query = query.gte("created_at", from);
    }
    if (to) {
      query = query.lte("created_at", to);
    }

    const { data: proposals, error } = await query;
    if (error) {
      return { ok: false, error: error.message };
    }

    // Filter to matching screen_name (inside JSONB inputs.proposal.screen_name)
    const matching = (proposals ?? []).filter((p: any) => {
      const inputs = p.inputs as Record<string, unknown>;
      const proposal = inputs?.proposal as Record<string, unknown> | undefined;
      return proposal?.screen_name === screen_name;
    });

    // Deduplicate
    const seen = new Set<string>();
    const deduped = matching.filter((p: any) => {
      if (seen.has(p.id)) return false;
      seen.add(p.id);
      return true;
    });

    const versions = deduped.map(toVersionEntry);

    let diff: VersionDiff | undefined;
    if (deduped.length >= 2) {
      diff = computeDiff(
        (deduped[0] as any).inputs as Record<string, unknown>,
        (deduped[deduped.length - 1] as any).inputs as Record<string, unknown>,
      );
    }

    // Shape response
    const userId = target_user_id ?? (deduped[0] as any)?.user_id;
    let presentedText: string | undefined;
    let presentedMeta:
      | { posture: string; familiarity: number; lint_violations: string[] }
      | undefined;

    if (userId) {
      const rawText = buildNarrative(versions, diff, screen_name);

      try {
        const personCtx = await buildContext(userId, {
          autonomy_level: 0,
          trust_score: 0.5,
          proposal_type: "ui_screen",
          recent_interaction_type: "design",
        });
        const shaped = shape(rawText, personCtx);
        presentedText = shaped.text;
        presentedMeta = {
          posture: shaped.posture,
          familiarity: shaped.familiarity_level,
          lint_violations: shaped.lint_result.violations,
        };
      } catch {
        presentedText = rawText;
      }
    }

    return {
      ok: true,
      versions,
      diff,
      presented_text: presentedText,
      presented_meta: presentedMeta,
    };
  } catch (e: any) {
    return {
      ok: false,
      error: e?.message ?? "Unknown error in design history",
    };
  }
}
