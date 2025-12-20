// scripts/sentinel/nightly-runner.ts
/**
 * TypeScript runner for Simulation Sentinel
 * This file is executed by nightly.mjs via tsx
 */

import { listSimulationScenarios, runSimulationPaths } from "../../lib/simulation/server/runSimulationPaths";
import { generateFixPlan } from "../../lib/simulation/server/fixPlan";
import { applyPatch, extractPatchFromFixplanJson, readJson } from "../fixplans/_patchlib.mjs";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

function sh(cmd: string, args: string[], opts: any = {}) {
  const r = spawnSync(cmd, args, { stdio: "pipe", encoding: "utf8", ...opts });
  if (r.error) throw r.error;
  return r;
}

function git(args: string[]) {
  const r = sh("git", args);
  if (r.status !== 0) throw new Error(`git ${args.join(" ")} failed:\n${r.stderr || r.stdout}`);
  return (r.stdout || "").trim();
}

function gh(args: string[]) {
  const r = sh("gh", args);
  if (r.status !== 0) throw new Error(`gh ${args.join(" ")} failed:\n${r.stderr || r.stdout}`);
  return (r.stdout || "").trim();
}

function nowKey() {
  const d = new Date();
  const yyyy = d.getUTCFullYear();
  const mm = String(d.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(d.getUTCDate()).padStart(2, "0");
  return `${yyyy}${mm}${dd}`;
}

function safeSlug(s: string) {
  return String(s || "")
    .toLowerCase()
    .replace(/[^a-z0-9/_-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^[-/]+|[-/]+$/g, "")
    .slice(0, 80);
}

function tail80(s: string) {
  return String(s || "").split("\n").slice(-80).join("\n");
}

function summarizeFailure(runResult: any) {
  const r = runResult?.result ?? runResult ?? null;
  if (!r) return "Simulation failed (no result).";
  if (typeof r.error === "string") return r.error;
  if (Array.isArray(r.steps)) {
    const bad = r.steps.find((x: any) => x && (x.ok === false || x.status === "error" || x.error));
    if (bad?.detail) return bad.detail;
    if (bad?.error) return bad.error;
    if (bad?.message) return bad.message;
    if (bad?.title) return `Failed: ${bad.title}`;
  }
  return "Simulation failed (unclassified).";
}

async function main() {
  console.log("\n=== Simulation Sentinel (Nightly) ===\n");

  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY env.");
  }

  const repoRoot = process.cwd();

  // Ensure repo + base
  git(["rev-parse", "--is-inside-work-tree"]);
  const baseBranch = git(["rev-parse", "--abbrev-ref", "HEAD"]);
  console.log(`Base branch: ${baseBranch}`);

  // Ensure clean working tree
  const porcelain = git(["status", "--porcelain"]);
  if (porcelain) throw new Error("Working tree not clean in CI. Refusing to proceed.");

  // List scenarios
  const scenarios = await listSimulationScenarios();
  if (!Array.isArray(scenarios) || scenarios.length === 0) {
    throw new Error("No simulation scenarios registered.");
  }
  console.log(`Scenarios: ${scenarios.length}`);

  // Run scenarios (stop on first regression for PR)
  const regressions: any[] = [];

  for (const s of scenarios) {
    console.log(`\n--- Running scenario: ${s.id} (${s.mode}) ---`);
    try {
      const out = await runSimulationPaths({
        userId: "sentinel",
        mode: s.mode,
        dealId: s.dealId ?? null,
        pathIds: s.mode === "single" ? (s.pathIds ?? null) : null,
        input: s.input ?? {},
        requestId: `sentinel_${s.id}_${nowKey()}`,
        route: "sentinel/nightly",
      });

      // Determine pass/fail
      const ok =
        (typeof out?.ok === "boolean" && out.ok) ||
        (typeof out?.result?.ok === "boolean" && out.result.ok) ||
        false;

      if (!ok) {
        const msg = summarizeFailure(out);
        console.log(`❌ Regression detected: ${msg}`);
        regressions.push({ scenario: s, out, msg });
        break;
      } else {
        console.log("✅ Passed");
      }
    } catch (e: any) {
      console.log(`❌ Regression detected (exception): ${e?.message || String(e)}`);
      regressions.push({ scenario: s, out: null, msg: e?.message || String(e) });
      break;
    }
  }

  if (regressions.length === 0) {
    console.log("\n✅ No regressions detected. Sentinel done.\n");
    return;
  }

  const regression = regressions[0];
  const scenarioId = regression.scenario.id;
  const dayKey = nowKey();

  // Idempotency check
  const branchPrefix = process.env.SENTINEL_BRANCH_PREFIX || "sentinel/fix";
  const branchName = `${branchPrefix}/${safeSlug(scenarioId)}-${dayKey}`;

  const remoteCheck = sh("git", ["ls-remote", "--heads", "origin", branchName]);
  if ((remoteCheck.stdout || "").includes(branchName)) {
    console.log(`\nℹ️ Branch already exists on origin (${branchName}). Skipping PR creation.\n`);
    return;
  }

  console.log(`\n=== Generating Fix Plan for ${scenarioId} ===`);

  const step = {
    id: "sentinel.fail",
    title: `Regression: ${scenarioId}`,
    ok: false,
    severity: "error",
    detail: regression.msg,
    pathId: regression.scenario.mode === "single" ? (regression.scenario.pathIds?.[0] ?? null) : null,
    data: regression.out ?? null,
  };

  const runCtx = {
    id: null,
    request_id: `sentinel_${scenarioId}_${dayKey}`,
    route: "sentinel/nightly",
    mode: regression.scenario.mode,
    deal_id: regression.scenario.dealId ?? null,
    path_ids: regression.scenario.pathIds ?? null,
    status: "error",
    error: regression.msg,
    duration_ms: null,
    started_at: new Date().toISOString(),
    finished_at: new Date().toISOString(),
    input: regression.scenario.input ?? {},
    result: regression.out ?? {},
  };

  const plan = await generateFixPlan({
    userId: "sentinel",
    run: runCtx,
    step,
  });

  const patch = plan.patch_json || null;
  if (!patch || patch.version !== "patch.v1" || !Array.isArray(patch.ops) || patch.ops.length === 0) {
    console.log("\n⚠️ Fix plan did not include a usable patch_json. Creating an issue-only PR is disabled.\n");
    console.log("Fix plan markdown (tail):\n");
    console.log(tail80(plan.plan_markdown));
    throw new Error("No patch_json available; aborting auto PR.");
  }

  // Write fixplan artifact
  const tmpDir = path.resolve(repoRoot, "tmp");
  fs.mkdirSync(tmpDir, { recursive: true });
  const fixplanPath = path.join(tmpDir, `fixplan-${plan.request_id}.json`);
  fs.writeFileSync(
    fixplanPath,
    JSON.stringify(
      {
        request_id: plan.request_id,
        run: runCtx,
        scenario: regression.scenario,
        patch_json: patch,
        plan_markdown: plan.plan_markdown,
      },
      null,
      2
    ),
    "utf8"
  );
  console.log(`\nSaved fixplan artifact: ${fixplanPath}`);

  // Create branch
  console.log(`\n=== Creating branch: ${branchName} ===`);
  git(["checkout", "-b", branchName]);

  // Apply patch
  const allowDelete = (process.env.SENTINEL_ALLOW_DELETE || "false") === "true";
  applyPatch(patch, {
    dryRun: false,
    allowDelete,
    force: false,
  });

  // Stage changes
  git(["add", "-A"]);

  const changed = git(["diff", "--cached", "--name-only"]);
  const changedList = changed ? changed.split("\n").filter(Boolean) : [];
  if (changedList.length === 0) {
    git(["checkout", baseBranch]);
    throw new Error("Patch produced no changes. Aborting.");
  }

  // Gate
  const gateCmd = process.env.SENTINEL_GATE || "npm run build";
  console.log(`\n=== Gate: ${gateCmd} ===`);
  const gateParts = gateCmd.split(/\s+/);
  const gateCmdName = gateParts[0];
  const gateArgs = gateParts.slice(1);

  const gate = sh(gateCmdName, gateArgs, {
    stdio: "pipe",
    encoding: "utf8",
    shell: process.platform === "win32",
    cwd: repoRoot,
  });

  if (gate.status !== 0) {
    console.log("\n❌ Gate failed. Leaving branch for inspection.\n");
    console.log("--- Gate Output (tail) ---");
    console.log(tail80(`${gate.stdout || ""}\n${gate.stderr || ""}`));
    throw new Error("Gate failed; aborting PR creation.");
  }
  console.log("✅ Gate passed.");

  // Commit
  const title = `Fix(sim): sentinel regression ${scenarioId} (${dayKey})`;
  git(["commit", "-m", title]);

  // Push
  console.log("\n=== Pushing branch ===");
  git(["push", "-u", "origin", branchName]);

  // Create PR body
  const body = [
    `# Simulation Sentinel Fix`,
    ``,
    `## Context`,
    `- **Scenario**: ${scenarioId}`,
    `- **Sentinel Request ID**: ${plan.request_id}`,
    `- **Day Key**: ${dayKey}`,
    ``,
    `## What Failed`,
    `- ${regression.msg}`,
    ``,
    `## Changes Made`,
    `- ${patch.summary || "Applied automated patch from fix plan (patch.v1)"}`,
    ``,
    `## Files Changed`,
    ...changedList.map((f) => `- ${f}`),
    ``,
    `## Verification`,
    `- [x] Gate passed: \`${gateCmd}\``,
    `- [ ] Re-run simulation scenario suite`,
    ``,
    `## Fix Plan (excerpt)`,
    "```",
    ...String(plan.plan_markdown || "").split("\n").slice(0, 120),
    "```",
    ``,
    `## Patch Ops (summary)`,
    "```json",
    JSON.stringify(
      {
        version: patch.version,
        summary: patch.summary || null,
        ops: patch.ops.map((o: any) => ({ op: o.op, path: o.path, note: o.note || null })),
      },
      null,
      2
    ),
    "```",
    ``,
    `Artifact: \`${path.relative(repoRoot, fixplanPath)}\``,
  ].join("\n");

  console.log("\n=== Creating PR ===");
  const prUrl = gh([
    "pr",
    "create",
    "--title",
    title,
    "--body",
    body,
    "--base",
    baseBranch,
    "--head",
    branchName,
  ]);

  console.log(`\n✅ PR created: ${prUrl}\n`);
}

main().catch((e) => {
  console.error(`\n❌ ${e?.message || String(e)}\n`);
  process.exit(1);
});

