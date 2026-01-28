// tools/design_coherence.ts
// C5: Coherence Engine — detection only, proposal-gated.
// Detects duplicate screens, conflicting metrics, naming inconsistencies.
// Outputs ui_coherence_suggestion proposals. Never auto-applies.
// Canon: never throw, return structured status, no retries.

import crypto from "node:crypto";
import { z } from "zod";
import { getSupabase } from "../supabase.js";
import { buildContext, shape } from "../personhood/index.js";
import { isPhaseCEnabled } from "./design_flags.js";

// ============================================
// INPUT SCHEMA
// ============================================

const inputSchema = z.object({
  target_user_id: z.string().min(10),
});

// ============================================
// TYPES
// ============================================

interface CoherenceIssue {
  issue_type: "duplicate_screen" | "conflicting_metric" | "naming_inconsistency";
  description: string;
  affected_proposals: string[];
  suggested_action: "merge" | "rename" | "review";
}

// ============================================
// DETECTION HELPERS
// ============================================

function detectDuplicateScreens(
  proposals: Array<{ id: string; screen_name: string; intent: string }>,
): CoherenceIssue[] {
  const issues: CoherenceIssue[] = [];
  const nameMap = new Map<string, Array<{ id: string; intent: string }>>();

  for (const p of proposals) {
    if (!nameMap.has(p.screen_name)) nameMap.set(p.screen_name, []);
    nameMap.get(p.screen_name)!.push({ id: p.id, intent: p.intent });
  }

  for (const [name, entries] of nameMap) {
    if (entries.length > 1) {
      issues.push({
        issue_type: "duplicate_screen",
        description: `${entries.length} proposals for "${name}" — consider merging or archiving older versions.`,
        affected_proposals: entries.map((e) => e.id),
        suggested_action: "merge",
      });
    }
  }

  return issues;
}

function detectConflictingMetrics(
  proposals: Array<{
    id: string;
    screen_name: string;
    components: Array<{ name: string; data_source?: string }>;
  }>,
): CoherenceIssue[] {
  const issues: CoherenceIssue[] = [];

  // Find components across screens that use the same data source differently
  const sourceMap = new Map<
    string,
    Array<{ screen_name: string; component_name: string; proposal_id: string }>
  >();

  for (const p of proposals) {
    for (const c of p.components) {
      if (!c.data_source) continue;
      if (!sourceMap.has(c.data_source)) sourceMap.set(c.data_source, []);
      sourceMap.get(c.data_source)!.push({
        screen_name: p.screen_name,
        component_name: c.name,
        proposal_id: p.id,
      });
    }
  }

  for (const [source, entries] of sourceMap) {
    // Check for same data source on different screens with different component names
    const uniqueScreens = new Set(entries.map((e) => e.screen_name));
    if (uniqueScreens.size > 1) {
      const componentNames = [...new Set(entries.map((e) => e.component_name))];
      if (componentNames.length > 1) {
        issues.push({
          issue_type: "conflicting_metric",
          description: `"${source}" is displayed by ${componentNames.join(", ")} across ${uniqueScreens.size} screens. Consider standardizing.`,
          affected_proposals: [...new Set(entries.map((e) => e.proposal_id))],
          suggested_action: "review",
        });
      }
    }
  }

  return issues;
}

function detectNamingInconsistencies(
  proposals: Array<{ id: string; screen_name: string }>,
): CoherenceIssue[] {
  const issues: CoherenceIssue[] = [];
  const names = proposals.map((p) => p.screen_name);

  // Check for mixed naming conventions
  const hasUnderscore = names.some((n) => n.includes("_"));
  const hasCamelCase = names.some((n) => /[a-z][A-Z]/.test(n));
  const hasKebab = names.some((n) => n.includes("-"));

  const conventionCount = [hasUnderscore, hasCamelCase, hasKebab].filter(
    Boolean,
  ).length;

  if (conventionCount > 1) {
    issues.push({
      issue_type: "naming_inconsistency",
      description: `Mixed naming conventions detected across ${names.length} screens. Consider standardizing to one convention.`,
      affected_proposals: proposals.map((p) => p.id),
      suggested_action: "rename",
    });
  }

  return issues;
}

// ============================================
// MAIN FUNCTION
// ============================================

export async function checkCoherence(input: unknown): Promise<{
  ok: boolean;
  issues?: CoherenceIssue[];
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

  const { target_user_id } = parsed.data;

  try {
    const sb = getSupabase();

    // Gather all design proposals for this user
    const { data: rawProposals } = await sb
      .from("pulse_proposals")
      .select("id, inputs, intent, created_at")
      .eq("user_id", target_user_id)
      .in("tool", ["design.propose_screen", "design.refine_screen"])
      .order("created_at", { ascending: false })
      .limit(50);

    if (!rawProposals || rawProposals.length === 0) {
      return { ok: true, issues: [], proposal_ids: [] };
    }

    // Extract structured data
    const structured = rawProposals
      .map((p: any) => {
        const inputs = p.inputs as Record<string, unknown>;
        const proposal = inputs?.proposal as Record<string, unknown> | undefined;
        if (!proposal) return null;

        return {
          id: p.id,
          screen_name: (proposal.screen_name as string) ?? "unknown",
          intent: p.intent as string,
          components: ((proposal.components ?? []) as any[]).map((c: any) => ({
            name: c.name as string,
            data_source: c.data_source as string | undefined,
          })),
        };
      })
      .filter(Boolean) as Array<{
      id: string;
      screen_name: string;
      intent: string;
      components: Array<{ name: string; data_source?: string }>;
    }>;

    // Run all detections
    const allIssues: CoherenceIssue[] = [
      ...detectDuplicateScreens(structured),
      ...detectConflictingMetrics(structured),
      ...detectNamingInconsistencies(structured),
    ];

    // Write coherence suggestions as proposals
    const proposalIds: string[] = [];
    for (const issue of allIssues) {
      const callId = `coherence-${crypto.randomUUID()}`;
      const { data: proposalData } = await sb
        .from("pulse_proposals")
        .insert({
          call_id: callId,
          tool: "design.check_coherence",
          scope: "propose",
          agent: "design_intelligence",
          intent: `Coherence: ${issue.issue_type}`,
          inputs: {
            proposal_type: "ui_coherence_suggestion",
            issue,
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
    if (allIssues.length === 0) {
      presentedText =
        "No coherence issues detected. Screen names, metrics, and layouts are consistent.";
    } else {
      const summaries = allIssues.map((i) => i.description);
      presentedText = summaries.join(" ") + " Want to address any of these?";
    }

    let presentedMeta:
      | { posture: string; familiarity: number; lint_violations: string[] }
      | undefined;

    try {
      const personCtx = await buildContext(target_user_id, {
        autonomy_level: 0,
        trust_score: 0.5,
        proposal_type: "ui_coherence_suggestion",
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
      issues: allIssues,
      proposal_ids: proposalIds,
      presented_text: presentedText,
      presented_meta: presentedMeta,
    };
  } catch (e: any) {
    return {
      ok: false,
      error: e?.message ?? "Unknown error checking coherence",
    };
  }
}
