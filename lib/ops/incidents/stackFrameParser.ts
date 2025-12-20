// src/lib/ops/incidents/stackFrameParser.ts
import "server-only";

export type ParsedFrame = {
  file: string; // repo-relative like "src/..."
  line: number | null;
  col: number | null;
  raw: string;
};

function stripParens(s: string) {
  // "fn (path:line:col)" -> "path:line:col"
  const m = s.match(/\((.+)\)$/);
  return m ? m[1] : s;
}

function toRepoRelative(p: string) {
  // Keep from "src/" or "app/" onward
  const idxSrc = p.lastIndexOf("src/");
  const idxApp = p.lastIndexOf("app/");
  const idx = Math.max(idxSrc, idxApp);
  if (idx >= 0) return p.slice(idx);
  return p;
}

export function parseStackFrames(stack: string): ParsedFrame[] {
  const lines = (stack || "")
    .split("\n")
    .map((s) => s.trim())
    .filter(Boolean);

  const out: ParsedFrame[] = [];

  for (const l of lines) {
    // Typical forms:
    // "at fn (src/path/file.ts:16:20)"
    // "at src/path/file.ts:16:20"
    // "src/path/file.ts:16:20"
    let s = l.replace(/^at\s+/i, "").trim();
    s = stripParens(s).trim();
    s = s.replace(/^file:\/\//, "");

    // find something containing src/ or app/
    if (!s.includes("src/") && !s.includes("/src/") && !s.includes("app/") && !s.includes("/app/")) {
      continue;
    }

    // extract trailing :line:col
    const m = s.match(/(.+):(\d+):(\d+)$/);
    const m2 = s.match(/(.+):(\d+)$/);

    let path = s;
    let line: number | null = null;
    let col: number | null = null;

    if (m) {
      path = m[1];
      line = Number(m[2]);
      col = Number(m[3]);
    } else if (m2) {
      path = m2[1];
      line = Number(m2[2]);
    }

    const file = toRepoRelative(path.replace(/\\/g, "/"));

    // Only accept repo-ish paths
    if (!file.startsWith("src/") && !file.startsWith("app/")) continue;

    out.push({ file, line: Number.isFinite(line as any) ? line : null, col: Number.isFinite(col as any) ? col : null, raw: l });
  }

  return out;
}

