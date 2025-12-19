// app/api/ops/features/autopilot-issue/route.ts

import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/**
 * Finds the rolling Canary Autopilot issue via GitHub API.
 *
 * Env (server-only):
 *  - GITHUB_REPO: "owner/repo"
 *  - GITHUB_TOKEN: fine-scoped PAT with read access to issues (repo scope for private repos)
 *
 * Behavior:
 *  - Prefer open issue with exact title
 *  - Fallback: open issues with label "canary" (most recently updated)
 */
export async function GET() {
  try {
    const repo = process.env.GITHUB_REPO || "";
    const token = process.env.GITHUB_TOKEN || "";

    if (!repo) {
      return NextResponse.json(
        { ok: false, error: "Missing env var: GITHUB_REPO (expected 'owner/repo')" },
        { status: 500 }
      );
    }
    if (!token) {
      return NextResponse.json(
        { ok: false, error: "Missing env var: GITHUB_TOKEN" },
        { status: 500 }
      );
    }

    const [owner, name] = repo.split("/");
    if (!owner || !name) {
      return NextResponse.json(
        { ok: false, error: "Invalid GITHUB_REPO format (expected 'owner/repo')" },
        { status: 500 }
      );
    }

    const ISSUE_TITLE = "Canary Autopilot: Core features failing";
    const LABEL_FALLBACK = "canary";

    const headers = {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
    };

    // Fetch up to 100 open issues. This is cheap and reliable.
    const url = `https://api.github.com/repos/${owner}/${name}/issues?state=open&per_page=100`;
    const res = await fetch(url, { headers, cache: "no-store" });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      return NextResponse.json(
        { ok: false, error: `GitHub API error ${res.status}: ${text || res.statusText}` },
        { status: 500 }
      );
    }

    const issues = (await res.json()) as any[];

    // Prefer exact title match
    let found = issues.find((it) => it?.title === ISSUE_TITLE);

    // Fallback: label match (most recently updated)
    if (!found) {
      const labeled = issues.filter((it) =>
        Array.isArray(it?.labels)
          ? it.labels.some((l: any) => (l?.name || "").toLowerCase() === LABEL_FALLBACK)
          : false
      );
      labeled.sort((a, b) => {
        const au = new Date(a?.updated_at || 0).getTime();
        const bu = new Date(b?.updated_at || 0).getTime();
        return bu - au;
      });
      found = labeled[0];
    }

    if (!found) {
      return NextResponse.json({
        ok: true,
        found: false,
        url: null,
        number: null,
        state: "closed",
        updatedAt: null,
        title: ISSUE_TITLE,
      });
    }

    return NextResponse.json({
      ok: true,
      found: true,
      url: found.html_url || null,
      number: found.number || null,
      state: found.state || "open",
      updatedAt: found.updated_at || null,
      title: found.title || ISSUE_TITLE,
    });
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, error: err?.message ?? "Failed to discover autopilot issue" },
      { status: 500 }
    );
  }
}

