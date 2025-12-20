// src/lib/ops/github/postmortemPr.ts
import "server-only";

type GitHubCfg = {
  owner: string;
  repo: string;
  token: string; // GITHUB_ACTIONS_PAT
  baseBranch: string; // "main"
};

type CreatePostmortemPrArgs = {
  title: string;
  body: string;
  branch: string; // "postmortem/auto-..."
  filePath: string; // "docs/postmortems/....md"
  fileContent: string; // markdown
  commitMessage: string;
};

async function ghFetch(cfg: GitHubCfg, path: string, init?: RequestInit) {
  const url = `https://api.github.com/repos/${cfg.owner}/${cfg.repo}${path}`;
  const res = await fetch(url, {
    ...init,
    headers: {
      authorization: `Bearer ${cfg.token}`,
      accept: "application/vnd.github+json",
      "content-type": "application/json",
      "user-agent": "buddy-postmortem-bot",
      ...(init?.headers || {}),
    },
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`github_api_failed:${res.status}:${path}:${text.slice(0, 400)}`);
  }

  // Some endpoints return 204
  if (res.status === 204) return null;
  return res.json();
}

function b64(s: string) {
  // Node runtime supports Buffer
  return Buffer.from(s, "utf8").toString("base64");
}

export async function createPostmortemPr(cfg: GitHubCfg, args: CreatePostmortemPrArgs) {
  // 1) Get base branch SHA
  const ref = await ghFetch(cfg, `/git/ref/heads/${encodeURIComponent(cfg.baseBranch)}`);
  const baseSha: string = (ref as any).object.sha;

  // 2) Create new branch ref
  await ghFetch(cfg, `/git/refs`, {
    method: "POST",
    body: JSON.stringify({
      ref: `refs/heads/${args.branch}`,
      sha: baseSha,
    }),
  });

  // 3) Create/Update file contents on that branch
  // Using "Create or update file contents" endpoint
  await ghFetch(cfg, `/contents/${encodeURIComponent(args.filePath)}`.replaceAll("%2F", "/"), {
    method: "PUT",
    body: JSON.stringify({
      message: args.commitMessage,
      content: b64(args.fileContent),
      branch: args.branch,
    }),
  });

  // 4) Open PR
  const pr = await ghFetch(cfg, `/pulls`, {
    method: "POST",
    body: JSON.stringify({
      title: args.title,
      head: args.branch,
      base: cfg.baseBranch,
      body: args.body,
    }),
  });

  return {
    prNumber: (pr as any).number as number,
    prUrl: (pr as any).html_url as string,
    branch: args.branch,
    filePath: args.filePath,
  };
}

