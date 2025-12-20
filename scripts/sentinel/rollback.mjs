// scripts/sentinel/rollback.mjs
import { spawnSync } from "node:child_process";

function die(msg) {
  console.error(`\n❌ ${msg}\n`);
  process.exit(1);
}

function sh(cmd, args, opts = {}) {
  const r = spawnSync(cmd, args, { stdio: "pipe", encoding: "utf8", ...opts });
  if (r.error) throw r.error;
  return r;
}

function git(args) {
  const r = sh("git", args);
  if (r.status !== 0) die(`git ${args.join(" ")} failed:\n${r.stderr || r.stdout}`);
  return (r.stdout || "").trim();
}

function gh(args) {
  const r = sh("gh", args, { env: { ...process.env, GH_TOKEN: process.env.GH_TOKEN } });
  if (r.status !== 0) die(`gh ${args.join(" ")} failed:\n${r.stderr || r.stdout}`);
  return (r.stdout || "").trim();
}

function envBool(name, def = "false") {
  const v = String(process.env[name] ?? def).toLowerCase();
  return v === "true" || v === "1" || v === "yes";
}

function envStr(name, def = "") {
  return process.env[name] ?? def;
}

function nowKey() {
  const d = new Date();
  const yyyy = d.getUTCFullYear();
  const mm = String(d.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(d.getUTCDate()).padStart(2, "0");
  const hh = String(d.getUTCHours()).padStart(2, "0");
  const mi = String(d.getUTCMinutes()).padStart(2, "0");
  return `${yyyy}${mm}${dd}-${hh}${mi}`;
}

function tail80(s) {
  return String(s || "").split("\n").slice(-80).join("\n");
}

function branchExistsRemote(branch) {
  const r = sh("git", ["ls-remote", "--heads", "origin", branch]);
  return (r.stdout || "").includes(branch);
}

function findLastSentinelCommit() {
  // Looks for most recent commit message containing "Fix(sim): sentinel"
  const r = sh("git", ["log", "-n", "50", "--pretty=%H%x09%s"]);
  if (r.status !== 0) return null;
  const lines = (r.stdout || "").split("\n").filter(Boolean);
  for (const line of lines) {
    const [sha, subject] = line.split("\t");
    if (subject && subject.includes("Fix(sim): sentinel")) return sha;
  }
  return null;
}

async function main() {
  const prefix = envStr("ROLLBACK_BRANCH_PREFIX", "revert/prod");
  const sentinelOnly = envBool("ROLLBACK_PICK_SENTINEL_ONLY", "true");
  const gateCmd = envStr("ROLLBACK_GATE", "npm run build");
  const prodUrl = envStr("PROD_URL", "");

  git(["rev-parse", "--is-inside-work-tree"]);
  git(["fetch", "origin", "main"]);
  git(["checkout", "main"]);
  git(["reset", "--hard", "origin/main"]);

  const head = git(["rev-parse", "HEAD"]);
  const headMsg = git(["log", "-1", "--pretty=%s"]);
  const key = nowKey();

  // Choose target commit to revert
  const sentinelSha = sentinelOnly ? findLastSentinelCommit() : null;
  const target = sentinelSha || head;

  const branch = `${prefix}/${target.slice(0, 8)}-${key}`;

  if (branchExistsRemote(branch)) {
    console.log(`\nℹ️ Rollback branch already exists (${branch}). Skipping.\n`);
    return;
  }

  console.log("\n=== ROLLBACK SENTINEL ===");
  console.log(`Prod URL: ${prodUrl || "(not set here; used by smoke workflow step)"}`);
  console.log(`HEAD: ${head}  (${headMsg})`);
  console.log(`Target to revert: ${target}${sentinelSha ? " (last sentinel commit)" : ""}`);
  console.log(`Branch: ${branch}`);

  // Create branch
  git(["checkout", "-b", branch]);

  // Revert commit
  // For squash merges this is one commit, so a simple revert is safest.
  const rev = sh("git", ["revert", "--no-edit", target]);
  if (rev.status !== 0) {
    console.error("\n--- git revert output (tail) ---");
    console.error(tail80(`${rev.stdout || ""}\n${rev.stderr || ""}`));
    die("git revert failed (likely conflicts). Manual intervention needed.");
  }

  // Gate
  console.log(`\n=== Gate: ${gateCmd} ===`);
  const gateParts = gateCmd.split(/\s+/);
  const gateCmdName = gateParts[0];
  const gateArgs = gateParts.slice(1);

  const gate = sh(gateCmdName, gateArgs, {
    stdio: "pipe",
    encoding: "utf8",
    shell: process.platform === "win32",
  });

  if (gate.status !== 0) {
    console.error("\n--- Gate output (tail) ---");
    console.error(tail80(`${gate.stdout || ""}\n${gate.stderr || ""}`));
    die("Rollback gate failed. Not opening PR.");
  }
  console.log("✅ Gate passed.");

  // Push
  git(["push", "-u", "origin", branch]);

  // Create PR with required metadata
  const title = `Rollback: production smoke failed (${target.slice(0, 8)})`;
  const incidentTime = new Date().toISOString();
  const headMsg = git(["log", "-1", "--pretty=%s", target]);

  const body = [
    `# Automated Rollback PR`,
    ``,
    `Production smoke failed, so Sentinel prepared a revert PR.`,
    ``,
    `## Rollback Metadata (Required)`,
    `ROLLBACK_OF_SHA: ${target}`,
    `ROLLBACK_OF_COMMIT: ${headMsg}`,
    `INCIDENT_TIMESTAMP: ${incidentTime}`,
    `WAS_SENTINEL_COMMIT: ${sentinelSha ? "yes" : "no"}`,
    prodUrl ? `PROD_URL: ${prodUrl}` : ``,
    ``,
    `## Context`,
    `- **Target reverted**: ${target}`,
    `- **Commit message**: ${headMsg}`,
    `- **Was sentinel commit**: ${sentinelSha ? "yes" : "no (reverted HEAD)"}`,
    `- **Gate passed**: \`${gateCmd}\``,
    prodUrl ? `- **Prod URL**: ${prodUrl}` : ``,
    ``,
    `## What to do`,
    `- Merge this PR to roll back the breaking change`,
    `- Re-run Sentinel to regenerate a safe fix PR`,
    ``,
  ]
    .filter(Boolean)
    .join("\n");

  const prUrl = gh(["pr", "create", "--title", title, "--body", body, "--base", "main", "--head", branch]);

  console.log(`\n✅ Rollback PR created: ${prUrl}\n`);

  // Label + comment
  // Extract PR number from URL (format: https://github.com/owner/repo/pull/123)
  const prNum = prUrl.match(/\/pull\/(\d+)/)?.[1];
  if (prNum) {
    gh(["pr", "edit", prNum, "--add-label", "rollback"]);
    gh([
      "pr",
      "comment",
      prNum,
      "--body",
      "🚨 Auto-rollback prepared due to production smoke failure. Merge to revert.",
    ]);
  }
}

main().catch((e) => die(e?.message || String(e)));

