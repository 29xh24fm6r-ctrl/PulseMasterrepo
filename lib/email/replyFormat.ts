/**
 * Thread-aware reply formatting helpers.
 * These are used by the draft generator to ensure proper reply formatting.
 */

/**
 * Ensures a subject line has "Re:" prefix if it's a reply.
 * Doesn't duplicate if already present.
 */
export function ensureReplySubject(subject: string): string {
  const trimmed = (subject || "").trim();
  if (!trimmed) return "Re:";
  
  // Check if already starts with "Re:" (case-insensitive, with optional spacing)
  const rePrefix = /^re\s*:/i;
  if (rePrefix.test(trimmed)) {
    return trimmed;
  }
  
  return `Re: ${trimmed}`;
}

/**
 * Builds a quoted message block for email replies.
 * Returns empty string if no quote data is provided.
 */
export function buildQuoteBlock(args: {
  from?: string | null;
  dateIso?: string | null;
  snippet?: string | null;
}): string {
  const from = (args.from || "").trim();
  const snippet = (args.snippet || "").trim();
  
  if (!from && !snippet) {
    return "";
  }
  
  const dateStr = args.dateIso
    ? (() => {
        const d = new Date(args.dateIso);
        if (!Number.isNaN(d.getTime())) {
          return d.toLocaleString();
        }
        return null;
      })()
    : null;
  
  const lines: string[] = [];
  lines.push("");
  lines.push("---");
  if (from) {
    lines.push(`On ${dateStr || "..."}, ${from} wrote:`);
  } else if (dateStr) {
    lines.push(`On ${dateStr}:`);
  } else {
    lines.push("Previous message:");
  }
  lines.push("");
  if (snippet) {
    // Indent the snippet
    const indented = snippet
      .split("\n")
      .map((line) => `> ${line}`)
      .join("\n");
    lines.push(indented);
  }
  lines.push("");
  
  return lines.join("\n");
}

