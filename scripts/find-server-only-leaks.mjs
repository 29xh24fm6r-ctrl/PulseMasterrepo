// scripts/find-server-only-leaks.mjs
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const EXT_OK = new Set([".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs"]);
const IGNORE_DIRS = new Set([
  "node_modules",
  ".next",
  ".git",
  "dist",
  "build",
  "out",
  ".turbo",
]);

// Things that should never be reachable from a client component
const FORBIDDEN_TOKENS = [
  "@clerk/nextjs/server",
  'import "server-only"',
  "next/headers",
  "cookies(",
  "headers(",
];

function walk(dir, out = []) {
  try {
    for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
      const p = path.join(dir, ent.name);
      if (ent.isDirectory()) {
        if (!IGNORE_DIRS.has(ent.name)) walk(p, out);
      } else {
        const ext = path.extname(ent.name);
        if (EXT_OK.has(ext)) out.push(p);
      }
    }
  } catch (e) {
    // ignore permission errors
  }
  return out;
}

function readFileSafe(fp) {
  try {
    return fs.readFileSync(fp, "utf8");
  } catch {
    return "";
  }
}

function extractImports(src) {
  const imports = new Set();

  for (const m of src.matchAll(/from\s+["']([^"']+)["']/g)) imports.add(m[1]);
  for (const m of src.matchAll(/import\s+["']([^"']+)["']/g)) imports.add(m[1]);
  for (const m of src.matchAll(/require\(\s*["']([^"']+)["']\s*\)/g)) imports.add(m[1]);

  return [...imports];
}

function resolveImport(fromFile, spec) {
  if (!spec.startsWith(".") && !spec.startsWith("@/")) return null;

  const baseDir = path.dirname(fromFile);
  const candidates = [];

  if (spec.startsWith("@/")) {
    const rel = spec.replace(/^@\//, "");
    candidates.push(path.join(ROOT, rel));
  } else {
    candidates.push(path.resolve(baseDir, spec));
  }

  const resolved = [];
  for (const c of candidates) {
    if (fs.existsSync(c) && fs.statSync(c).isFile()) {
      resolved.push(c);
      continue;
    }

    for (const ext of [".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs"]) {
      if (fs.existsSync(c + ext)) {
        resolved.push(c + ext);
        break;
      }
    }

    for (const ext of [".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs"]) {
      const idx = path.join(c, "index" + ext);
      if (fs.existsSync(idx)) {
        resolved.push(idx);
        break;
      }
    }
  }

  return resolved.length ? resolved[0] : null;
}

function hasForbiddenToken(src) {
  return FORBIDDEN_TOKENS.some((t) => src.includes(t));
}

function isClientComponent(src) {
  return src.includes('"use client"') || src.includes("'use client'");
}

function loadAllowlist() {
  const fp = path.join(ROOT, "scripts", "server-only-leaks.allowlist.json");
  if (!fs.existsSync(fp)) return [];

  try {
    const parsed = JSON.parse(fs.readFileSync(fp, "utf8"));
    const list = Array.isArray(parsed?.allowlist) ? parsed.allowlist : [];
    // normalize to relative paths
    return list
      .filter((x) => typeof x === "string" && x.trim().length > 0)
      .map((x) => x.replace(/\\/g, "/"));
  } catch {
    return [];
  }
}

function isAllowlistedFile(relPath, allowlist) {
  const p = relPath.replace(/\\/g, "/");
  // Exact match or prefix match (directory allowlisting)
  return allowlist.some((a) => p === a || p.startsWith(a.endsWith("/") ? a : a + "/"));
}

const allFiles = walk(ROOT);
const fileSrc = new Map(allFiles.map((f) => [f, readFileSafe(f)]));
const allowlist = loadAllowlist();

function bfsReachForbidden(startFile) {
  const visited = new Set();
  const parent = new Map(); // child -> parent
  const queue = [startFile];
  visited.add(startFile);

  while (queue.length) {
    const cur = queue.shift();
    const src = fileSrc.get(cur) || "";

    if (cur !== startFile && hasForbiddenToken(src)) {
      // reconstruct path
      const chain = [cur];
      let p = cur;
      while (parent.has(p)) {
        p = parent.get(p);
        chain.push(p);
      }
      chain.reverse();
      return chain;
    }

    const imports = extractImports(src);
    for (const imp of imports) {
      const resolved = resolveImport(cur, imp);
      if (!resolved) continue;
      if (!fileSrc.has(resolved)) continue;
      if (visited.has(resolved)) continue;

      visited.add(resolved);
      parent.set(resolved, cur);
      queue.push(resolved);
    }
  }

  return null;
}

const clientFiles = allFiles.filter((f) => isClientComponent(fileSrc.get(f) || ""));
const findings = [];

for (const cf of clientFiles) {
  const chain = bfsReachForbidden(cf);
  if (chain) findings.push({ client: cf, chain });
}

// Apply allowlist filtering:
// If the FORBIDDEN file (last element) is allowlisted, we ignore the finding.
const actionable = findings.filter((f) => {
  const forbiddenFileAbs = f.chain[f.chain.length - 1];
  const forbiddenRel = path.relative(ROOT, forbiddenFileAbs).replace(/\\/g, "/");
  return !isAllowlistedFile(forbiddenRel, allowlist);
});

if (!actionable.length) {
  if (findings.length) {
    console.log(`✅ No actionable leaks. (${findings.length} allowlisted)`);
  } else {
    console.log("✅ No client → server-only leaks found by scanner.");
  }
  process.exit(0);
}

console.log(`❌ Found ${actionable.length} actionable client → server-only leak(s):\n`);
for (const f of actionable) {
  console.log("CLIENT:", path.relative(ROOT, f.client));
  console.log("CHAIN:");
  for (const p of f.chain) console.log("  -", path.relative(ROOT, p));
  console.log("");
}

console.log("Allowlist file: scripts/server-only-leaks.allowlist.json");
console.log("Add ONLY the forbidden file path(s) you want to explicitly ignore.");
process.exit(1);
