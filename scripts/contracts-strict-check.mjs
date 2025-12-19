#!/usr/bin/env node
/**
 * CI Guard: Contract Strict Mode Check
 * 
 * Fails CI if any server route exists without a registered contract (allowlist supported).
 * Checks both changed routes AND newly added routes.
 * 
 * Usage:
 *   npm run contracts:strict
 * 
 * Exit codes:
 *   0 = All routes have contracts (or allowlisted)
 *   1 = Missing contracts found
 */

import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, "..");

const API_DIR = path.join(ROOT, "app", "api");

// Keep allowlist SHORT and shrink over time
const ALLOWLIST = new Set([
  // "POST /api/webhooks/twilio",
]);

function runGit(cmd) {
  try {
    return execSync(cmd, { encoding: "utf8", cwd: ROOT }).trim();
  } catch (e) {
    return "";
  }
}

function routePathFromFile(fp) {
  const rel = path.relative(API_DIR, fp);
  const parts = rel.split(path.sep);
  parts.pop(); // route.ts
  return "/api/" + parts.join("/");
}

function detectMethods(contents) {
  const methods = ["GET", "POST", "PUT", "PATCH", "DELETE"];
  return methods.filter((m) =>
    new RegExp(`export\\s+async\\s+function\\s+${m}\\s*\\(`).test(contents)
  );
}

function loadRegistryIds() {
  const registryPath = path.join(ROOT, "lib", "contracts", "registry.ts");
  if (!fs.existsSync(registryPath)) {
    console.error("❌ Missing lib/contracts/registry.ts");
    process.exit(1);
  }
  const text = fs.readFileSync(registryPath, "utf8");
  const ids = [...text.matchAll(/id:\s*["'`]([^"'`]+)["'`]/g)].map((m) => m[1]);
  return new Set(ids);
}

function resolveRouteFilesFromGitList(files) {
  return files
    .map((p) => p.replaceAll("\\", "/"))
    .filter((p) => p.startsWith("app/api/") && p.endsWith("/route.ts"))
    .map((p) => path.join(ROOT, p));
}

function getChangedRouteFiles() {
  try {
    const out = runGit(`git diff --name-only origin/main...HEAD`);
    return resolveRouteFilesFromGitList(out ? out.split("\n").filter(Boolean) : []);
  } catch {
    try {
      const out = runGit(`git diff --name-only HEAD~1...HEAD`);
      return resolveRouteFilesFromGitList(out ? out.split("\n").filter(Boolean) : []);
    } catch {
      return [];
    }
  }
}

function getAddedRouteFiles() {
  try {
    const out = runGit(`git diff --name-only --diff-filter=A origin/main...HEAD`);
    return resolveRouteFilesFromGitList(out ? out.split("\n").filter(Boolean) : []);
  } catch {
    try {
      const out = runGit(`git diff --name-only --diff-filter=A HEAD~1...HEAD`);
      return resolveRouteFilesFromGitList(out ? out.split("\n").filter(Boolean) : []);
    } catch {
      return [];
    }
  }
}

async function main() {
  const registryIds = loadRegistryIds();

  // ✅ Enforce contracts on: changed routes + newly added routes
  const changedRoutes = getChangedRouteFiles();
  const addedRoutes = getAddedRouteFiles();
  const targets = Array.from(new Set([...changedRoutes, ...addedRoutes]));

  if (targets.length === 0) {
    console.log("✅ Contract strict mode: no route changes detected.");
    process.exit(0);
  }

  const missing = [];

  for (const rf of targets) {
    if (!fs.existsSync(rf)) continue;

    const route = routePathFromFile(rf);
    const contents = fs.readFileSync(rf, "utf8");
    const methods = detectMethods(contents);
    if (methods.length === 0) continue;

    for (const m of methods) {
      const id = `${m} ${route}`;
      if (ALLOWLIST.has(id)) continue;
      if (!registryIds.has(id)) {
        missing.push({ id, file: path.relative(ROOT, rf) });
      }
    }
  }

  if (missing.length) {
    console.error(`❌ Contract strict mode failed. Missing contracts for ${missing.length} route(s):\n`);
    for (const x of missing) {
      console.error(`   ${x.id}`);
      console.error(`   ${x.file}\n`);
    }
    console.error("💡 Fix: add contract entry to lib/contracts/registry.ts OR allowlist temporarily in scripts/contracts-strict-check.mjs");
    process.exit(1);
  }

  console.log("✅ Contract strict mode: changed/new routes have registered contracts (or allowlisted).");
  console.log(`   Checked ${targets.length} route file(s).`);
}

main().catch((e) => {
  console.error("❌ Contract strict check error:", e);
  process.exit(1);
});
