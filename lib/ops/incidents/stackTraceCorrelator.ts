// src/lib/ops/incidents/stackTraceCorrelator.ts
import "server-only";
import type { DiffLens } from "@/lib/ops/incidents/postmortemBuilder";
import { parseStackFrames } from "@/lib/ops/incidents/stackFrameParser";

export type StackMatch = {
  file: string;
  count: number;
  // up to 3 raw examples
  examples: string[];
  // best observed line/col (most frequent)
  line: number | null;
  col: number | null;
};

export type StackCorrelatorResult = {
  ok: boolean;
  matchedFiles: StackMatch[];
  unmatchedFrames: string[];
  rawFrames: string[];
  note?: string | null;
};

function uniq<T>(arr: T[]) {
  return Array.from(new Set(arr));
}

export function correlateStacksToDiff(args: {
  diff: DiffLens | null;
  stacks: string[]; // collected stacks within incident window
}): StackCorrelatorResult {
  if (!args.diff?.ok || !args.diff.files?.length) {
    return { ok: false, matchedFiles: [], unmatchedFrames: [], rawFrames: [], note: "diff_lens_unavailable" };
  }

  const changed = new Set(args.diff.files.map((f) => f.filename));
  const rawFrames: string[] = [];
  const unmatchedFrames: string[] = [];

  // file -> { count, examples, lineVotes, colVotes }
  const counts = new Map<
    string,
    { count: number; examples: string[]; lineVotes: Map<number, number>; colVotes: Map<number, number> }
  >();

  for (const stack of args.stacks) {
    const frames = parseStackFrames(stack);

    // record raw frames (stringified-ish)
    for (const fr of frames) rawFrames.push(fr.raw);

    for (const fr of frames) {
      const file = fr.file;
      const isChanged = changed.has(file);

      if (!isChanged) {
        unmatchedFrames.push(fr.raw);
        continue;
      }

      const cur =
        counts.get(file) || { count: 0, examples: [], lineVotes: new Map<number, number>(), colVotes: new Map<number, number>() };

      cur.count += 1;

      if (cur.examples.length < 3) cur.examples.push(fr.raw);

      if (typeof fr.line === "number" && fr.line) {
        cur.lineVotes.set(fr.line, (cur.lineVotes.get(fr.line) || 0) + 1);
      }
      if (typeof fr.col === "number" && fr.col) {
        cur.colVotes.set(fr.col, (cur.colVotes.get(fr.col) || 0) + 1);
      }

      counts.set(file, cur);
    }
  }

  const pickMostVoted = (m: Map<number, number>) => {
    let best: number | null = null;
    let bestV = 0;
    for (const [k, v] of m.entries()) {
      if (v > bestV) {
        bestV = v;
        best = k;
      }
    }
    return best;
  };

  const matchedFiles: StackMatch[] = Array.from(counts.entries())
    .map(([file, v]) => ({
      file,
      count: v.count,
      examples: v.examples,
      line: pickMostVoted(v.lineVotes),
      col: pickMostVoted(v.colVotes),
    }))
    .sort((a, b) => b.count - a.count);

  return {
    ok: true,
    matchedFiles,
    unmatchedFrames: uniq(unmatchedFrames).slice(0, 25),
    rawFrames: uniq(rawFrames).slice(0, 50),
  };
}

export function correlatorToMarkdown(res: StackCorrelatorResult) {
  if (!res.ok) {
    return `## Stack Trace Correlator (Evidence)\n- (Correlator unavailable)\n\n`;
  }

  const matches =
    res.matchedFiles.length === 0
      ? `- No stack frames matched changed files (Diff Lens).`
      : res.matchedFiles
          .slice(0, 8)
          .map((m) => {
            const loc = m.line ? ` @ line ${m.line}${m.col ? `:${m.col}` : ""}` : "";
            const ex = m.examples.length
              ? `\n  Examples:\n${m.examples.map((e) => `  - \`${e.replace(/`/g, "")}\``).join("\n")}`
              : "";
            return `- **${m.file}** — matched frames: **${m.count}**${loc}${ex}`;
          })
          .join("\n");

  const unmatched =
    res.unmatchedFrames.length
      ? `\n### Unmatched frames (sample)\n${res.unmatchedFrames.map((f) => `- \`${f.replace(/`/g, "")}\``).join("\n")}\n`
      : "";

  return `## Stack Trace Correlator (Evidence)

### Matched changed files

${matches}

${unmatched}

`;
}
