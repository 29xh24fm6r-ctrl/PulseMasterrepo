type SmartFollowUpArgs = {
  tone?: string;
  goal?: string;

  // Thread context (best effort)
  quoteFrom?: string | null;
  quoteDate?: string | null; // ISO
  quoteSnippet?: string | null;

  // Optional: user's seed text (if they typed something)
  seed?: string | null;
};

function fmtDate(iso?: string | null) {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleString();
}

function cleanSnippet(s?: string | null, maxLen = 280) {
  const t = (s || "").replace(/\s+/g, " ").trim();
  if (!t) return "";
  return t.length <= maxLen ? t : t.slice(0, maxLen - 1) + "…";
}

export function buildSmartFollowUp(args: SmartFollowUpArgs) {
  const tone = (args.tone || "professional").toLowerCase();
  const goal = (args.goal || "get an update").toLowerCase();

  const from = (args.quoteFrom || "").trim();
  const when = fmtDate(args.quoteDate || null);
  const snippet = cleanSnippet(args.quoteSnippet || null);

  const ctxBits = [
    from ? `reaching back out` : null,
    when ? `from ${when}` : null,
  ].filter(Boolean);

  const ctxLine =
    ctxBits.length
      ? `Just ${ctxBits.join(" ")}.`
      : `Just following up here.`;

  const referenceLine =
    snippet
      ? `Last note was: "${snippet}"`
      : null;

  // "next action" line tuned by goal
  let askLine = `Can you share a quick update on where this stands and the next step?`;
  if (goal.includes("schedule") || goal.includes("call") || goal.includes("meeting")) {
    askLine = `Can we lock a quick time to connect? I'm free for a short call—what works best on your end?`;
  } else if (goal.includes("docs") || goal.includes("document") || goal.includes("paperwork")) {
    askLine = `Can you confirm what's still outstanding and when you expect to have it over?`;
  } else if (goal.includes("approval") || goal.includes("decision")) {
    askLine = `Any update on timing for a decision? If there's anything you need from me to move it along, I can jump on it.`;
  } else if (goal.includes("pricing") || goal.includes("terms")) {
    askLine = `Any update on terms/pricing? Happy to adjust on my end once I know where things landed.`;
  }

  // Tone adjustments (light but consistent)
  let opener = `Hi —`;
  let close = `Thanks,\n`;
  if (tone.includes("friendly") || tone.includes("warm")) {
    opener = `Hey —`;
    close = `Thanks so much,\n`;
  } else if (tone.includes("direct") || tone.includes("concise")) {
    opener = `Hi —`;
    close = `Thanks,\n`;
  } else if (tone.includes("formal")) {
    opener = `Hello —`;
    close = `Thank you,\n`;
  }

  const seed = (args.seed || "").trim();
  const seedLine = seed ? `${seed}\n\n` : "";

  const lines = [
    opener,
    "",
    seedLine + ctxLine,
    referenceLine ? referenceLine : null,
    "",
    askLine,
    "",
    close,
  ].filter(Boolean);

  return lines.join("\n");
}

