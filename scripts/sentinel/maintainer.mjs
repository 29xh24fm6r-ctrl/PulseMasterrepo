// scripts/sentinel/maintainer.mjs
/**
 * Maintainer: Auto-merge Sentinel PRs that pass all gates
 * - Requires canary-green label
 * - Requires all checks to pass
 * - Closes stale PRs
 */

import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function sh(cmd, args, opts = {}) {
  const r = spawnSync(cmd, args, { stdio: "pipe", encoding: "utf8", ...opts });
  if (r.error) throw r.error;
  return r;
}

function gh(args) {
  const r = sh("gh", args);
  if (r.status !== 0) throw new Error(`gh ${args.join(" ")} failed:\n${r.stderr || r.stdout}`);
  return (r.stdout || "").trim();
}

function envStr(key, def) {
  return process.env[key] || def;
}

function envNum(key, def) {
  const v = process.env[key];
  return v ? Number(v) : def;
}

function envBool(key, def) {
  const v = process.env[key];
  if (v === "true" || v === "1") return true;
  if (v === "false" || v === "0") return false;
  return def;
}

async function main() {
  console.log("\n=== Sentinel Maintainer ===\n");

  const requireLabel = envStr("SENTINEL_REQUIRE_LABEL", "canary-green");
  const staleDays = envNum("SENTINEL_STALE_DAYS", 7);
  const baseBranch = envStr("SENTINEL_BASE_BRANCH", "main");
  const autoMerge = envBool("SENTINEL_AUTO_MERGE", false);

  console.log(`Config:`);
  console.log(`- Require label: ${requireLabel}`);
  console.log(`- Stale days: ${staleDays}`);
  console.log(`- Base branch: ${baseBranch}`);
  console.log(`- Auto-merge: ${autoMerge}`);

  // List all open PRs from sentinel branches
  const prsJson = gh([
    "pr",
    "list",
    "--base",
    baseBranch,
    "--state",
    "open",
    "--json",
    "number,title,headRefName,createdAt,isDraft,mergeable,labels,statusCheckRollup",
  ]);

  const prs = JSON.parse(prsJson);
  const sentinelPrs = prs.filter((p) => p.headRefName.startsWith("sentinel/fix/"));

  if (sentinelPrs.length === 0) {
    console.log("\n✅ No sentinel PRs to process.\n");
    return;
  }

  console.log(`\nFound ${sentinelPrs.length} sentinel PR(s):`);

  for (const pr of sentinelPrs) {
    console.log(`\n--- PR #${pr.number}: ${pr.title} ---`);

    // Check if draft
    if (pr.isDraft) {
      console.log(`#${pr.number} is draft. Skipping.`);
      continue;
    }

    // Check mergeable status
    if (pr.mergeable === false) {
      console.log(`#${pr.number} is not mergeable (conflicts). Skipping.`);
      continue;
    }

    // Require canary label (conservative)
    if (requireLabel) {
      const labels = pr.labels?.map((l) => l?.name).filter(Boolean) || [];
      if (!labels.includes(requireLabel)) {
        console.log(`#${pr.number} missing required label "${requireLabel}". Skipping.`);
        continue;
      }
    }

    // Check status checks
    const checks = pr.statusCheckRollup || [];
    const failedChecks = checks.filter((c) => c.conclusion === "FAILURE");
    const pendingChecks = checks.filter((c) => c.status === "PENDING" || c.status === "IN_PROGRESS");

    if (failedChecks.length > 0) {
      console.log(`#${pr.number} has ${failedChecks.length} failed check(s). Skipping.`);
      continue;
    }

    if (pendingChecks.length > 0) {
      console.log(`#${pr.number} has ${pendingChecks.length} pending check(s). Skipping.`);
      continue;
    }

    // Check if stale
    const createdAt = new Date(pr.createdAt);
    const now = new Date();
    const daysOld = (now - createdAt) / (1000 * 60 * 60 * 24);

    if (daysOld > staleDays) {
      console.log(`#${pr.number} is stale (${daysOld.toFixed(1)} days old). Closing.`);
      gh(["pr", "close", String(pr.number), "--comment", `Closed: PR is stale (${daysOld.toFixed(1)} days old)`]);
      continue;
    }

    // All checks passed - ready to merge
    console.log(`✅ #${pr.number} is ready to merge.`);

    if (autoMerge) {
      console.log(`Merging #${pr.number}...`);
      gh([
        "pr",
        "merge",
        String(pr.number),
        "--squash",
        "--delete-branch",
        "--body",
        `Auto-merged by Sentinel Maintainer\n\n- Canary: ✅ green\n- Checks: ✅ all passing\n- Label: ✅ ${requireLabel}`,
      ]);
      console.log(`✅ Merged #${pr.number}`);
    } else {
      console.log(`(Auto-merge disabled - set SENTINEL_AUTO_MERGE=true to enable)`);
    }
  }

  console.log("\n✅ Maintainer run complete.\n");
}

main().catch((e) => {
  console.error(`\n❌ ${e?.message || String(e)}\n`);
  process.exit(1);
});

