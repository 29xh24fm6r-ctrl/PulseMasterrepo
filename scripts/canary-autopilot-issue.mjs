// scripts/canary-autopilot-issue.mjs
// Reads canary JSON output and creates/updates a single rolling GitHub issue when core canaries fail.

import fs from "node:fs";
import process from "node:process";

const jsonPath = process.env.CANARY_JSON_PATH || "";
const token = process.env.GITHUB_TOKEN || "";
const repo = process.env.GITHUB_REPOSITORY || "";

if (!jsonPath || !fs.existsSync(jsonPath)) {
  console.error("Missing CANARY_JSON_PATH or file not found:", jsonPath);
  process.exit(2);
}
if (!token) {
  console.error("Missing GITHUB_TOKEN");
  process.exit(2);
}
if (!repo) {
  console.error("Missing GITHUB_REPOSITORY");
  process.exit(2);
}

const [owner, name] = repo.split("/");
const data = JSON.parse(fs.readFileSync(jsonPath, "utf8"));

const summary = data.summary || {};
const results = data.results || {};
const failingIds = summary.failingFeatureIds || Object.keys(results).filter((k) => !results[k]?.ok || results[k]?.severity === "fail");

const ISSUE_TITLE = "Canary Autopilot: Core features failing";
const ISSUE_LABEL = "canary";

function mdEscape(s) {
  return String(s ?? "").replace(/\r/g, "");
}

function buildBody() {
  const lines = [];
  lines.push(`## Canary Autopilot Report`);
  lines.push(`- Time: ${new Date().toISOString()}`);
  lines.push(`- Failing features: **${failingIds.length}**`);
  lines.push("");

  for (const fid of failingIds) {
    const r = results[fid];
    lines.push(`### ${fid}`);
    if (!r) {
      lines.push(`- Result missing`);
      lines.push("");
      continue;
    }
    lines.push(`- Severity: **${r.severity}**`);
    lines.push(`- Last run: ${r.createdAt || "—"}`);
    const failedChecks = (r.checks || []).filter((c) => !c.ok).slice(0, 6);

    if (failedChecks.length) {
      lines.push("");
      lines.push(`**Failed checks:**`);
      for (const c of failedChecks) {
        lines.push(`- ${mdEscape(c.label)}${c.details ? ` — ${mdEscape(c.details)}` : ""}`);
        if (c.fixHint?.summary) {
          lines.push(`  - Fix hint: ${mdEscape(c.fixHint.summary)}`);
          for (const step of c.fixHint.nextSteps || []) {
            lines.push(`    - ${mdEscape(step)}`);
          }
          if ((c.fixHint.filePaths || []).length) {
            lines.push(`    - Files: ${(c.fixHint.filePaths || []).map(mdEscape).join(", ")}`);
          }
        }
      }
    }
    lines.push("");
  }

  lines.push("---");
  lines.push("This issue is automatically updated by Canary Autopilot.");
  return lines.join("\n");
}

async function gh(path, opts = {}) {
  const res = await fetch(`https://api.github.com${path}`, {
    ...opts,
    headers: {
      Authorization: `Bearer ${token}`,
      "X-GitHub-Api-Version": "2022-11-28",
      Accept: "application/vnd.github+json",
      ...(opts.headers || {}),
    },
  });
  const text = await res.text();
  const json = text ? JSON.parse(text) : null;
  return { ok: res.ok, status: res.status, json };
}

async function main() {
  // If no failures: close existing issue if present.
  const body = buildBody();

  // Find existing open issue with same title (or label)
  const search = await gh(`/repos/${owner}/${name}/issues?state=open&per_page=100`);
  if (!search.ok) {
    console.error("Failed to list issues", search.status, search.json);
    process.exit(2);
  }

  const existing = (search.json || []).find((it) => it.title === ISSUE_TITLE);

  if (failingIds.length === 0) {
    if (existing) {
      console.log("No failures. Closing existing issue:", existing.number);
      await gh(`/repos/${owner}/${name}/issues/${existing.number}`, {
        method: "PATCH",
        body: JSON.stringify({ state: "closed" }),
      });
    } else {
      console.log("No failures. No open issue exists.");
    }
    return;
  }

  if (!existing) {
    console.log("Creating issue...");
    const created = await gh(`/repos/${owner}/${name}/issues`, {
      method: "POST",
      body: JSON.stringify({
        title: ISSUE_TITLE,
        body,
        labels: [ISSUE_LABEL],
      }),
    });
    if (!created.ok) {
      console.error("Failed to create issue", created.status, created.json);
      process.exit(2);
    }
    console.log("Created issue:", created.json.number);
  } else {
    console.log("Updating issue:", existing.number);
    const updated = await gh(`/repos/${owner}/${name}/issues/${existing.number}`, {
      method: "PATCH",
      body: JSON.stringify({ body }),
    });
    if (!updated.ok) {
      console.error("Failed to update issue", updated.status, updated.json);
      process.exit(2);
    }
    console.log("Updated issue:", updated.json.number);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(2);
});

