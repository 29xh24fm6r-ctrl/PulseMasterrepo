import { EmailTriageDecision, sanitizeTriageDecision } from "./triageDecision";

type InboundSignal = {
  subject: string | null;
  snippet: string | null;
  from_email: string | null;
  has_attachments: boolean;
  received_at: string | null;
};

function includesAny(hay: string, needles: string[]) {
  const h = hay.toLowerCase();
  return needles.some((n) => h.includes(n));
}

export function decideTriageFromInbound(signal: InboundSignal): EmailTriageDecision {
  const subject = signal.subject ?? "";
  const snippet = signal.snippet ?? "";
  const from = signal.from_email ?? "";

  const text = `${subject}\n${snippet}\n${from}`.trim();

  const urgencyP0 = includesAny(text, ["urgent", "asap", "immediately", "today", "now", "emergency"]);
  const urgencyP1 = includesAny(text, ["by tomorrow", "tomorrow", "soon", "time-sensitive", "deadline"]);

  const asksQuestion = text.includes("?") || includesAny(text, ["can you", "could you", "please", "need you to"]);
  const mentionsMeeting = includesAny(text, ["calendar", "invite", "meeting", "zoom", "teams", "call"]);

  const hasAttachments = !!signal.has_attachments;

  let urgency: "p0" | "p1" | "p2" | "p3" = "p2";
  if (urgencyP0) urgency = "p0";
  else if (urgencyP1) urgency = "p1";

  let suggested_action: "reply" | "followup" | "task" | "ignore" = "followup";
  let why = "Needs review";
  const evidence: Record<string, unknown> = {
    urgencyP0,
    urgencyP1,
    asksQuestion,
    mentionsMeeting,
    hasAttachments,
  };

  if (asksQuestion) {
    suggested_action = "reply";
    why = "Contains a direct question or request";
  } else if (mentionsMeeting) {
    suggested_action = "followup";
    why = "Meeting / scheduling context detected";
  } else if (hasAttachments) {
    suggested_action = "task";
    why = "Has attachments; likely requires processing";
  } else if (includesAny(text, ["newsletter", "unsubscribe", "no-reply", "do not reply"])) {
    suggested_action = "ignore";
    urgency = "p3";
    why = "Likely automated/non-actionable";
  }

  const score = urgency === "p0" ? 100 : urgency === "p1" ? 70 : urgency === "p2" ? 40 : 10;

  // Next action: for p0/p1 set earlier; else null (UI can decide)
  const next_action_at =
    urgency === "p0"
      ? new Date(Date.now() + 60 * 60 * 1000).toISOString() // +1h
      : urgency === "p1"
        ? new Date(Date.now() + 6 * 60 * 60 * 1000).toISOString() // +6h
        : null;

  return sanitizeTriageDecision({
    urgency,
    suggested_action,
    state: "triaged",
    score,
    next_action_at,
    why,
    evidence,
  });
}
