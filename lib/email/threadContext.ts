export type ThreadContext = {
  from_email: string;
  to_email: string;
  subject: string;
  snippet: string;
  received_at: string;
  message_id: string;
  in_reply_to?: string | null;
  references?: string[] | null;
};

export function buildReplySubject(subject: string) {
  return /^re:\s*/i.test(subject) ? subject : `Re: ${subject}`;
}

export function buildContextQuote(ctx: ThreadContext) {
  const when = safeDate(ctx.received_at);
  const from = ctx.from_email || "Sender";
  const snippet = (ctx.snippet || "").trim();
  const quote = snippet ? snippet : "(no snippet)";
  return `On ${when}, ${from} wrote:\n\n> ${quote.replace(/\n/g, "\n> ")}\n`;
}

export function draftReplyBody(ctx: ThreadContext) {
  return (
    `Hi,\n\n` +
    `Thanks for your note — quick reply below.\n\n` +
    `${buildContextQuote(ctx)}\n\n` +
    `Could you confirm next steps / timing?\n\n` +
    `Thanks,\n`
  );
}

export function draftFollowUpBody(ctx: ThreadContext) {
  return (
    `Hi,\n\n` +
    `Just checking back in — wanted to make sure this didn't get buried.\n\n` +
    `${buildContextQuote(ctx)}\n\n` +
    `Do you have an update on next steps / timing?\n\n` +
    `Thanks,\n`
  );
}

export function buildWhy(kind: "reply" | "follow_up") {
  if (kind === "reply") return "Detected an email that likely needs a response (question/request language).";
  return "This email has exceeded the SLA threshold without a recorded reply.";
}

function safeDate(iso: string) {
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
}

