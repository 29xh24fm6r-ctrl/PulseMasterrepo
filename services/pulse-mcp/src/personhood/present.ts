// personhood/present.ts
// Core presentation function — shapes raw design proposals into
// human-calibrated, conversationally fluent output.
//
// present_proposal(raw_proposal, context) → HumanReadableResponse
//
// Same data. Radically different experience.

import type {
  ConversationContext,
  FamiliarityLevel,
  Posture,
} from "./types.js";
import { governQuestions, constrainQuestion } from "./questions.js";

interface ProposalPayload {
  screen_name: string;
  intent: string;
  rationale: {
    why_this_layout: string;
    why_these_components: string;
    user_context_considered: string[];
  };
  components: Array<{
    name: string;
    priority: "primary" | "secondary" | "tertiary";
    message?: string;
  }>;
  interaction_model: {
    primary_action: string;
    secondary_action?: string;
  };
  tone_guidelines: string[];
  layout: {
    type: string;
    columns?: { desktop?: number; tablet?: number; mobile?: number };
  };
  variants?: Array<{
    variant_name: string;
    description: string;
  }>;
}

/**
 * Present a design proposal in conversational form.
 * Adjusts verbosity, tone, and question style based on context.
 */
export function presentProposal(
  proposal: ProposalPayload,
  ctx: ConversationContext,
): string {
  const primary = proposal.components.filter(
    (c) => c.priority === "primary",
  );
  const screenLabel = humanizeScreenName(proposal.screen_name);

  switch (ctx.familiarity) {
    case 3:
      return presentShorthand(screenLabel, primary, ctx);
    case 2:
      return presentCollaborator(screenLabel, primary, proposal, ctx);
    case 1:
      return presentRelaxed(screenLabel, primary, proposal, ctx);
    case 0:
    default:
      return presentFormal(screenLabel, primary, proposal, ctx);
  }
}

// ============================================
// FAMILIARITY-LEVEL TEMPLATES
// ============================================

function presentShorthand(
  screen: string,
  primary: ProposalPayload["components"],
  ctx: ConversationContext,
): string {
  const componentNames = primary.map((c) => humanizeComponentName(c.name));
  const line = `${screen}: ${componentNames.join(", ")}.`;
  return maybeAddQuestion(line, "Keep it clean?", ctx);
}

function presentCollaborator(
  screen: string,
  primary: ProposalPayload["components"],
  proposal: ProposalPayload,
  ctx: ConversationContext,
): string {
  const lines: string[] = [];
  lines.push(`${screen}.`);
  lines.push("");

  const componentSummary = primary
    .map((c) => humanizeComponentName(c.name))
    .join(", ");
  lines.push(`${primary.length} main sections: ${componentSummary}.`);

  // Add one contextual note from rationale
  if (proposal.rationale.user_context_considered.length > 0) {
    const note = proposal.rationale.user_context_considered[0];
    lines.push(`Based on ${note.toLowerCase()}.`);
  }

  return maybeAddQuestion(
    lines.join("\n"),
    pickQuestion(proposal, ctx),
    ctx,
  );
}

function presentRelaxed(
  screen: string,
  primary: ProposalPayload["components"],
  proposal: ProposalPayload,
  ctx: ConversationContext,
): string {
  const lines: string[] = [];
  lines.push(`Here's a ${screen}.`);
  lines.push("");

  // List primary components with messages if available
  for (const comp of primary) {
    const name = humanizeComponentName(comp.name);
    if (comp.message) {
      lines.push(`${name} — ${comp.message.toLowerCase()}`);
    } else {
      lines.push(name);
    }
  }

  // Brief rationale
  lines.push("");
  lines.push(shortenRationale(proposal.rationale.why_this_layout, 100));

  return maybeAddQuestion(
    lines.join("\n"),
    pickQuestion(proposal, ctx),
    ctx,
  );
}

function presentFormal(
  screen: string,
  primary: ProposalPayload["components"],
  proposal: ProposalPayload,
  ctx: ConversationContext,
): string {
  const lines: string[] = [];
  lines.push(`Proposal: ${screen}`);
  lines.push("");

  // Component breakdown
  lines.push(
    `${proposal.components.length} components (${primary.length} primary):`,
  );
  for (const comp of primary) {
    const name = humanizeComponentName(comp.name);
    lines.push(`  - ${name}${comp.message ? `: ${comp.message}` : ""}`);
  }

  // Rationale
  lines.push("");
  lines.push(`Layout: ${proposal.rationale.why_this_layout}`);

  // Context considered
  if (proposal.rationale.user_context_considered.length > 0) {
    lines.push("");
    lines.push("Context considered:");
    for (const note of proposal.rationale.user_context_considered.slice(
      0,
      3,
    )) {
      lines.push(`  - ${note}`);
    }
  }

  // Variants
  if (proposal.variants && proposal.variants.length > 0) {
    lines.push("");
    lines.push(
      `Variants available: ${proposal.variants.map((v) => v.variant_name).join(", ")}`,
    );
  }

  return maybeAddQuestion(
    lines.join("\n"),
    pickQuestion(proposal, ctx),
    ctx,
  );
}

// ============================================
// HELPERS
// ============================================

function humanizeScreenName(name: string): string {
  return name
    .replace(/^pulse_/, "")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function humanizeComponentName(name: string): string {
  // PascalCase → "signal severity banner"
  return name
    .replace(/([A-Z])/g, " $1")
    .trim()
    .toLowerCase();
}

function shortenRationale(text: string, maxLen: number): string {
  if (text.length <= maxLen) return text;
  const truncated = text.slice(0, maxLen);
  const lastSpace = truncated.lastIndexOf(" ");
  return truncated.slice(0, lastSpace > 0 ? lastSpace : maxLen) + ".";
}

function pickQuestion(
  proposal: ProposalPayload,
  ctx: ConversationContext,
): string {
  // Posture-aware question selection
  if (ctx.posture === "focused_minimal") return "";
  if (ctx.preferences.question_rate === "minimal") return "";

  // Pick a constrained question based on proposal content
  if (proposal.variants && proposal.variants.length > 0) {
    return constrainQuestion(
      `Want the ${proposal.variants[0].variant_name} variant instead?`,
    );
  }

  if (proposal.interaction_model.secondary_action) {
    return constrainQuestion(
      `${proposal.interaction_model.secondary_action}, or keep it as is?`,
    );
  }

  return "Want changes?";
}

function maybeAddQuestion(
  text: string,
  question: string,
  ctx: ConversationContext,
): string {
  if (!question || ctx.preferences.question_rate === "minimal") return text;
  const combined = `${text}\n\n${question}`;
  return governQuestions(combined, ctx.preferences);
}

/**
 * Shape arbitrary text (not a proposal) according to context.
 * Applies familiarity-level verbosity adjustments.
 */
export function shapeText(
  text: string,
  ctx: ConversationContext,
): string {
  let shaped = text;

  // Apply posture-specific adjustments
  if (ctx.posture === "focused_minimal") {
    // Strip filler words and hedging
    shaped = shaped
      .replace(/\b(just|actually|basically|essentially|really|very)\b/gi, "")
      .replace(/\s{2,}/g, " ")
      .trim();
  }

  // Apply familiarity-level verbosity
  if (ctx.familiarity >= 2) {
    // Remove hedging phrases
    shaped = shaped
      .replace(/I think (that )?/gi, "")
      .replace(/It seems like /gi, "")
      .replace(/You might want to /gi, "")
      .trim();
  }

  // Govern questions
  shaped = governQuestions(shaped, ctx.preferences);

  return shaped;
}
