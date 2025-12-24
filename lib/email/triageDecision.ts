export type EmailUrgency = "p0" | "p1" | "p2" | "p3";
export type EmailSuggestedAction = "reply" | "followup" | "task" | "ignore";
export type EmailTriageState = "triaged" | "suggested" | "done";

export type EmailTriageDecision = {
  urgency: EmailUrgency;
  suggested_action: EmailSuggestedAction;
  state: EmailTriageState;

  score: number | null;
  next_action_at: string | null;

  // IMPORTANT: split by DB type
  why: string | null; // text
  evidence: Record<string, unknown>; // jsonb object
};

export function sanitizeTriageDecision(input: Partial<EmailTriageDecision>): EmailTriageDecision {
  const urgency: EmailUrgency =
    input.urgency === "p0" || input.urgency === "p1" || input.urgency === "p2" || input.urgency === "p3"
      ? input.urgency
      : "p2";

  const suggested_action: EmailSuggestedAction =
    input.suggested_action === "reply" ||
    input.suggested_action === "followup" ||
    input.suggested_action === "task" ||
    input.suggested_action === "ignore"
      ? input.suggested_action
      : "followup";

  const state: EmailTriageState =
    input.state === "triaged" || input.state === "suggested" || input.state === "done" ? input.state : "triaged";

  const score = typeof input.score === "number" && Number.isFinite(input.score) ? input.score : null;

  const next_action_at = typeof input.next_action_at === "string" ? input.next_action_at : null;

  const why = typeof input.why === "string" ? input.why : null;

  const evidence =
    input.evidence && typeof input.evidence === "object" && !Array.isArray(input.evidence)
      ? (input.evidence as Record<string, unknown>)
      : {};

  return { urgency, suggested_action, state, score, next_action_at, why, evidence };
}

