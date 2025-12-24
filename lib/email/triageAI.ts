export type TriageLabel = "needs_reply" | "request" | "task" | "waiting_on_them" | "fyi";

export type TriageResult = {
  label: TriageLabel;
  confidence: number;
  rationale: string;
  recommend: {
    create_reminder: boolean;
    create_suggested_draft: boolean;
  };
};

function norm(s: string) {
  return (s || "").toLowerCase();
}

export function triageEmail(input: { subject: string; snippet: string }): TriageResult {
  const subj = norm(input.subject);
  const snip = norm(input.snippet);

  const hasQuestion = snip.includes("?") || snip.includes("can you") || snip.includes("could you");
  const isRequest = snip.includes("please") || snip.includes("need") || snip.includes("send") || snip.includes("provide");
  const isWaiting = snip.includes("let me know") || snip.includes("when you can") || snip.includes("following up");
  const isFyi = snip.includes("fyi") || subj.startsWith("fyi") || snip.includes("for your information");

  if (hasQuestion) {
    return {
      label: "needs_reply",
      confidence: 0.78,
      rationale: "Question/request for response detected.",
      recommend: { create_reminder: true, create_suggested_draft: true },
    };
  }

  if (isRequest) {
    return {
      label: "request",
      confidence: 0.74,
      rationale: "Polite/explicit request detected.",
      recommend: { create_reminder: true, create_suggested_draft: true },
    };
  }

  if (isWaiting) {
    return {
      label: "waiting_on_them",
      confidence: 0.66,
      rationale: "Follow-up / waiting language detected.",
      recommend: { create_reminder: false, create_suggested_draft: false },
    };
  }

  if (isFyi) {
    return {
      label: "fyi",
      confidence: 0.7,
      rationale: "FYI language detected.",
      recommend: { create_reminder: false, create_suggested_draft: false },
    };
  }

  return {
    label: "task",
    confidence: 0.55,
    rationale: "Unclear; treat as task-like for visibility.",
    recommend: { create_reminder: true, create_suggested_draft: false },
  };
}
