/* eslint-disable no-console */
// scripts/guards/guard-no-service-role.js
// Sprint 4.1: Guard against service role key leakage
const fs = require("fs");
const path = require("path");

const ROOT = process.cwd();
const DENY_DIRS = ["node_modules", ".next", "dist", "build", ".git", ".vercel"];

function walk(dir, out = []) {
  try {
    for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
      if (DENY_DIRS.includes(ent.name)) continue;
      const fp = path.join(dir, ent.name);
      if (ent.isDirectory()) {
        walk(fp, out);
      } else if (/\.(ts|tsx|js|jsx)$/.test(ent.name)) {
        out.push(fp);
      }
    }
  } catch (err) {
    // Skip directories we can't read
  }
  return out;
}

function read(fp) {
  try {
    return fs.readFileSync(fp, "utf8");
  } catch {
    return "";
  }
}

const files = walk(ROOT);

const hits = [];

for (const fp of files) {
  // Normalize path separators for cross-platform compatibility
  const rel = path.relative(ROOT, fp).replace(/\\/g, "/");
  const txt = read(fp);


  // Admin client should not be imported in client-side code
  const hasAdminImport =
    txt.match(/from\s+["']@\/lib\/supabase\/admin["']/) ||
    txt.match(/from\s+["']\.{1,2}\/.*\/supabase\/admin["']/);

  if (hasAdminImport) {
    const isApiRoute = rel.startsWith("app/api/");
    const isRouteHandler = rel.includes("/route.ts") || rel.includes("/route.tsx");
    const isServerLib = rel.startsWith("lib/") && txt.includes('import "server-only"');
    const isScript = rel.startsWith("scripts/");
    const isPageServer = rel.startsWith("app/") && (rel.endsWith("/page.tsx") || rel.endsWith("/page.ts")) && !txt.includes("use client");
    const hasServerOnly = txt.includes('import "server-only"');

    if (!isApiRoute && !isRouteHandler && !isServerLib && !isScript && !isPageServer && !hasServerOnly) {
      hits.push({
        file: rel,
        reason: "Imports lib/supabase/admin outside server-only contexts",
      });
    }
  }

  // Service role key references are OK in API routes, server libs, and scripts
  if (txt.includes("SUPABASE_SERVICE_ROLE_KEY")) {
    const isApiRoute = rel.startsWith("app/api/");
    const isServerLib = rel.startsWith("lib/") && (txt.includes('import "server-only"') || rel.includes("supabase"));
    const isScript = rel.startsWith("scripts/");
    const isEnvFile = rel.includes(".env") || rel.includes("env.example");

    if (!isApiRoute && !isServerLib && !isScript && !isEnvFile) {
      hits.push({ file: rel, reason: "Found SUPABASE_SERVICE_ROLE_KEY reference" });
    }
  }
}

if (hits.length) {
  console.error("❌ guard-no-service-role FAILED:");
  for (const h of hits) console.error(`  - ${h.file}: ${h.reason}`);
  process.exit(1);
}

console.log("✅ guard-no-service-role OK");
process.exit(0);

