// src/lib/ops/github/diffLens.ts
import "server-only";

type GitHubCfg = {
  owner: string;
  repo: string;
  token: string; // GITHUB_ACTIONS_PAT
};

type CompareFile = {
  filename: string;
  status: string;
  additions?: number;
  deletions?: number;
  changes?: number;
};

export type DiffLensResult = {
  ok: boolean;
  suspectSha: string | null;
  parentSha: string | null;
  compareUrl: string | null;
  prUrl: string | null;
  prNumber: number | null;
  prTitle: string | null;
  files: CompareFile[];
  note?: string | null;
};

async function gh(cfg: GitHubCfg, path: string) {
  const url = `https://api.github.com/repos/${cfg.owner}/${cfg.repo}${path}`;
  const res = await fetch(url, {
    method: "GET",
    headers: {
      authorization: `Bearer ${cfg.token}`,
      accept: "application/vnd.github+json",
      "user-agent": "buddy-diff-lens",
    },
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`github_api_failed:${res.status}:${path}:${text.slice(0, 400)}`);
  }
  return res.json();
}

export async function buildDiffLens(cfg: GitHubCfg, suspectSha: string | null): Promise<DiffLensResult> {
  if (!suspectSha) {
    return {
      ok: false,
      suspectSha: null,
      parentSha: null,
      compareUrl: null,
      prUrl: null,
      prNumber: null,
      prTitle: null,
      files: [],
      note: "No suspect SHA available",
    };
  }

  // 1) Get commit to find parent(s)
  const commit = await gh(cfg, `/commits/${suspectSha}`);
  const parents: { sha: string }[] = (commit as any)?.parents ?? [];
  const parentSha = parents?.[0]?.sha ?? null;

  // 2) Compare parent...suspect (best diff lens for a merge commit)
  let compareUrl: string | null = null;
  let files: CompareFile[] = [];

  if (parentSha) {
    const compare = await gh(cfg, `/compare/${parentSha}...${suspectSha}`);
    compareUrl = (compare as any)?.html_url ?? null;

    const rawFiles = ((compare as any)?.files ?? []) as any[];
    files = rawFiles.map((f) => ({
      filename: String(f.filename),
      status: String(f.status || ""),
      additions: typeof f.additions === "number" ? f.additions : undefined,
      deletions: typeof f.deletions === "number" ? f.deletions : undefined,
      changes: typeof f.changes === "number" ? f.changes : undefined,
    }));
  }

  // 3) Try to resolve PR for this commit (works best for merge commits)
  // Requires special preview header historically, but "application/vnd.github+json" generally works now.
  // If this fails, we just omit PR fields.
  let prUrl: string | null = null;
  let prNumber: number | null = null;
  let prTitle: string | null = null;

  try {
    const prs = await gh(cfg, `/commits/${suspectSha}/pulls`);
    const pr = Array.isArray(prs) ? prs[0] : null;
    if (pr) {
      prUrl = (pr as any).html_url ?? null;
      prNumber = typeof (pr as any).number === "number" ? (pr as any).number : null;
      prTitle = (pr as any).title ?? null;
    }
  } catch {
    // ignore
  }

  return {
    ok: true,
    suspectSha,
    parentSha,
    compareUrl,
    prUrl,
    prNumber,
    prTitle,
    files,
  };
}

