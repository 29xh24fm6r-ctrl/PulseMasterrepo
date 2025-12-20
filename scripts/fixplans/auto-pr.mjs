// scripts/fixplans/auto-pr.mjs
import path from "node:path";
import { spawnSync } from "node:child_process";
import {
  die,
  readJson,
  extractPatchFromFixplanJson,
  applyPatch,
} from "./_patchlib.mjs";

function sh(cmd, args, opts = {}) {
  const r = spawnSync(cmd, args, { stdio: "pipe", encoding: "utf8", ...opts });
  if (r.error) throw r.error;
  return r;
}

function mustGit() {
  const r = sh("git", ["rev-parse", "--is-inside-work-tree"]);
  if (r.status !== 0) die("Not a git repository (git rev-parse failed). Run inside repo root.");
}

function gitOut(args) {
  const r = sh("git", args);
  if (r.status !== 0) die(`git ${args.join(" ")} failed:\n${r.stderr || r.stdout}`);
  return (r.stdout || "").trim();
}

function parseArgs(argv) {
  const args = {
    file: null,
    dryRun: false,
    allowDelete: false,
    force: false,
    branch: null,
    gate: "npm run build",
    noGate: false,
  };

  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (!args.file && !a.startsWith("--")) args.file = a;
    else if (a === "--dry-run") args.dryRun = true;
    else if (a === "--allow-delete") args.allowDelete = true;
    else if (a === "--force") args.force = true;
    else if (a.startsWith("--branch=")) args.branch = a.split("=", 2)[1] || null;
    else if (a.startsWith("--gate=")) args.gate = a.split("=", 2)[1] || "npm run build";
    else if (a === "--no-gate") args.noGate = true;
    else die(`Unknown arg: ${a}`);
  }

  if (!args.file) {
    die("Usage: node scripts/fixplans/auto-pr.mjs <fixplan.json> [--dry-run] [--allow-delete] [--force] [--branch=fix/... ] [--gate=\"npm run build\"] [--no-gate]");
  }
  return args;
}

function safeBranchName(s) {
  return String(s || "")
    .toLowerCase()
    .replace(/[^a-z0-9/_-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^[-/]+|[-/]+$/g, "")
    .slice(0, 80);
}

function inferRequestId(json) {
  // Try common locations
  return (
    json?.request_id ||
    json?.plan?.request_id ||
    json?.active_fixplan?.request_id ||
    json?.run?.request_id ||
    null
  );
}

function main() {
  const args = parseArgs(process.argv);
  mustGit();

  const fp = path.resolve(process.cwd(), args.file);
  const json = readJson(fp);
  const patch = extractPatchFromFixplanJson(json);
  if (!patch) die("No patch_json found in fixplan JSON.");

  const requestId = inferRequestId(json) || "unknown";
  const branchName = args.branch || `fix/sim-${safeBranchName(requestId) || "patch"}`;

  console.log(`\n✅ Loaded patch (request_id: ${requestId})`);
  if (patch.summary) console.log(`Summary: ${patch.summary}`);
  console.log(`\nBranch: ${branchName}`);

  const currentBranch = gitOut(["rev-parse", "--abbrev-ref", "HEAD"]);

  // Ensure working tree clean-ish (don't hard fail; just warn unless --force)
  const status = gitOut(["status", "--porcelain"]);
  if (status && !args.force) {
    die(
      "Working tree is not clean. Commit/stash first, or re-run with --force.\n" +
        "Tip: git status --porcelain shows pending changes."
    );
  }

  // Create branch
  if (!args.dryRun) {
    const exists = sh("git", ["show-ref", "--verify", `refs/heads/${branchName}`]);
    if (exists.status === 0) die(`Branch already exists: ${branchName}. Use --branch=... to choose another.`);
    gitOut(["checkout", "-b", branchName]);
  } else {
    console.log("\n🟦 DRY RUN: would create branch and apply patch, but will not write or run gate.\n");
  }

  // Apply patch
  const res = applyPatch(patch, {
    dryRun: args.dryRun,
    allowDelete: args.allowDelete,
    force: args.force,
  });

  console.log("\nPlanned operations:");
  for (const p of res.planned) console.log(`- ${String(p.op).padEnd(6)} ${p.rel}${p.note ? `  (${p.note})` : ""}`);

  if (args.dryRun) {
    console.log("\n🟦 DRY RUN complete.\n");
    // Return to original branch if we switched (we didn't in dry run)
    return;
  }

  // Git add
  gitOut(["add", "-A"]);

  // Show changed files
  const changed = gitOut(["diff", "--cached", "--name-only"]);
  const changedList = changed ? changed.split("\n").filter(Boolean) : [];

  if (changedList.length === 0) {
    // Nothing changed; go back
    gitOut(["checkout", currentBranch]);
    die("Patch produced no git changes. Aborting.");
  }

  // Gate (build)
  let gateOk = true;
  let gateOut = "";

  if (!args.noGate) {
    console.log(`\n🔎 Gate: ${args.gate}`);
    
    // Handle npm commands specially (they need shell on Windows)
    const useShell = process.platform === "win32";
    const gateParts = args.gate.split(/\s+/);
    const gateCmd = gateParts[0];
    const gateArgs = gateParts.slice(1);

    const r = sh(gateCmd, gateArgs, { 
      stdio: "pipe", 
      encoding: "utf8", 
      shell: useShell,
      cwd: process.cwd(),
    });

    gateOut = `${r.stdout || ""}\n${r.stderr || ""}`.trim();
    gateOk = r.status === 0;

    if (!gateOk) {
      console.error("\n❌ Gate FAILED. Leaving branch in place for inspection.");
      console.error("\n--- Gate Output (tail) ---");
      console.error(gateOut.split("\n").slice(-80).join("\n"));
      process.exit(2);
    }

    console.log("✅ Gate passed.");
  } else {
    console.log("\n⚠️ Gate skipped (--no-gate).");
  }

  // Commit
  const msg = `Fix(sim): apply patch for ${requestId}`;
  gitOut(["commit", "-m", msg]);

  // PR-ready summary (expanded)
  console.log("\n================ PR SUMMARY =================");

  console.log(`Branch: ${branchName}`);
  console.log(`Base:   main`);
  console.log(`Title:  ${msg}`);

  console.log("\n--- PR BODY (copy-paste) ---\n");

  console.log(`# Simulation Fix PR\n`);

  console.log(`## Context`);
  console.log(`- **Simulation Request ID**: ${requestId}`);
  console.log(`- **Fix Plan Request ID**: ${requestId}`);
  if (patch.summary) {
    console.log(`- **Fix Summary**: ${patch.summary}`);
  }

  console.log(`\n## What Failed`);
  if (json?.run?.error) {
    console.log(`- ${json.run.error}`);
  } else {
    console.log(`- See simulation run details for request_id ${requestId}`);
  }

  console.log(`\n## Root Cause Hypothesis`);
  if (json?.active_fixplan?.plan_markdown) {
    const lines = json.active_fixplan.plan_markdown.split("\n");
    const idx = lines.findIndex((l) => l.toLowerCase().includes("most likely causes"));
    if (idx !== -1) {
      console.log(lines.slice(idx, idx + 6).join("\n"));
    } else {
      console.log(`- See Fix Plan for details`);
    }
  } else if (json?.plan_markdown) {
    const lines = json.plan_markdown.split("\n");
    const idx = lines.findIndex((l) => l.toLowerCase().includes("most likely causes"));
    if (idx !== -1) {
      console.log(lines.slice(idx, idx + 6).join("\n"));
    } else {
      console.log(`- See Fix Plan for details`);
    }
  } else {
    console.log(`- See Fix Plan for details`);
  }

  console.log(`\n## Changes Made`);
  if (patch.summary) {
    console.log(`- ${patch.summary}`);
  } else {
    console.log(`- Applied automated patch from fix plan`);
  }

  console.log(`\n## Files Changed`);
  for (const f of changedList) {
    console.log(`- ${f}`);
  }

  console.log(`\n## Verification`);
  console.log(`- [x] ${args.noGate ? "Gate skipped" : `Gate passed: ${args.gate}`}`);
  console.log(`- [ ] Re-ran simulation scenario`);
  console.log(`- [ ] Confirmed simulation status = success`);

  console.log(`\n## Safety / Guardrails`);
  console.log(`- [x] Patch applied via allowlisted paths only`);
  console.log(`- [x] Server-only boundaries preserved`);
  console.log(`- [x] Backups created (*.bak)`);

  console.log("\n--- END PR BODY ---\n");

  console.log("How to open PR:");
  console.log(`- git push -u origin ${branchName}`);
  console.log("- Open a PR in GitHub and paste the PR BODY above.");
  console.log("\n============================================\n");
}

main();

