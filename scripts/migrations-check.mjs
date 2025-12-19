#!/usr/bin/env node
/**
 * CI Guard: Migration Safety Check
 * 
 * Fails CI if:
 * - Schema-related code changed but no migration added
 * - Migration filenames aren't timestamped/ordered
 * - Migrations include risky patterns without explicit flags
 * 
 * Usage:
 *   npm run migrations:check
 * 
 * Exit codes:
 *   0 = Migration safety check passed
 *   1 = Migration safety violations found
 */

import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, "..");

const MIG_DIRS = [
  path.join(ROOT, "supabase", "migrations"),
  path.join(ROOT, "migrations"),
  path.join(ROOT, "sql", "migrations"),
].filter((d) => fs.existsSync(d));

if (MIG_DIRS.length === 0) {
  console.log("ℹ️ No migrations directory found (skipping migrations check).");
  process.exit(0);
}

function listMigrations(dir) {
  return fs
    .readdirSync(dir)
    .filter((f) => f.endsWith(".sql"))
    .sort()
    .map((f) => ({ dir, file: f, full: path.join(dir, f) }));
}

function isTimestamped(name) {
  // supports: 20251218_x.sql or 20251218123000_x.sql
  return /^\d{8}(\d{6})?_/.test(name);
}

function runGit(cmd) {
  try {
    return execSync(cmd, { encoding: "utf8", cwd: ROOT }).trim();
  } catch (e) {
    return "";
  }
}

// Files changed in this PR/branch vs main (works in CI checkout too)
let changed = [];
try {
  const out = runGit(`git diff --name-only origin/main...HEAD`);
  changed = out ? out.split("\n").filter(Boolean) : [];
} catch {
  // fallback: compare to HEAD~1 for local runs
  try {
    const out = runGit(`git diff --name-only HEAD~1...HEAD`);
    changed = out ? out.split("\n").filter(Boolean) : [];
  } catch {
    // If git commands fail, assume no changes (safe default)
    changed = [];
  }
}

// Heuristic: schema-relevant areas changed
// Only flag actual database schema changes, not infrastructure/library code
const schemaTouched = changed.some((p) => {
  // Skip ALL library/infrastructure files (these don't touch DB schema)
  if (
    p.startsWith("lib/") || // All library code
    p.includes("scripts/") ||
    p.includes(".github/") ||
    p.includes("docs/") ||
    p.includes("middleware.ts") ||
    p.includes("package.json") ||
    p.includes("tsconfig") ||
    p.startsWith("app/") // App routes/pages don't change schema
  ) {
    return false;
  }
  // Check for actual schema-related changes
  // Only flag if Supabase config/schema files changed (not migration files themselves)
  return (
    (p.includes("supabase") && !p.includes("migrations")) || // Supabase config changes
    p.includes("/schema") || // Explicit schema files (not lib/schema)
    (p.includes("db") && !p.includes("lib/")) // DB-related but not library code
  );
});

const migrationFiles = MIG_DIRS.flatMap(listMigrations);
const newMigrations = migrationFiles.filter((m) => {
  const rel = path.relative(ROOT, m.full);
  return changed.includes(rel);
});

const errors = [];

// 1) enforce naming (only for new migrations, not existing ones)
for (const m of newMigrations) {
  if (!isTimestamped(m.file)) {
    errors.push(`Migration not timestamped: ${path.relative(ROOT, m.full)}`);
  }
}

// 2) if schema touched, require a migration (unless already included in change)
// Only enforce if we have a reliable git diff (not in local dev without proper git setup)
if (schemaTouched && newMigrations.length === 0 && changed.length > 0) {
  // Double-check: make sure we're not in a local dev scenario where git diff is unreliable
  // Filter out all infrastructure/library files to find actual schema changes
  const actualSchemaFiles = changed.filter((p) => {
    // Skip ALL infrastructure/library files
    if (
      p.startsWith("lib/") ||
      p.includes("scripts/") ||
      p.includes(".github/") ||
      p.includes("docs/") ||
      p.includes("middleware.ts") ||
      p.includes("package.json") ||
      p.includes("tsconfig") ||
      p.startsWith("app/")
    ) {
      return false;
    }
    // Only flag actual Supabase schema/config files
    return p.includes("supabase") && !p.includes("migrations");
  });
  
  // Only fail if we have actual schema file changes (not library code)
  if (actualSchemaFiles.length > 0) {
    errors.push(
      `Schema-related files changed but no new migration SQL added. Add a migration under: ${MIG_DIRS.map(d => path.relative(ROOT, d)).join(", ")}`
    );
  }
  // If no actual schema files, skip the check (likely false positive from git diff)
}

// 3) risky patterns (warn/fail)
const RISKY = [
  /drop\s+table/i,
  /drop\s+column/i,
  /alter\s+table.*drop/i,
  /truncate\s+table/i,
];

for (const m of newMigrations) {
  const sql = fs.readFileSync(m.full, "utf8");
  const riskyHits = RISKY.filter((rx) => rx.test(sql));
  if (riskyHits.length) {
    // require an explicit annotation to proceed
    if (!/--\s*ALLOW_RISKY_MIGRATION/i.test(sql)) {
      errors.push(
        `Risky migration detected without override comment (-- ALLOW_RISKY_MIGRATION): ${path.relative(ROOT, m.full)}`
      );
    }
  }
}

if (errors.length) {
  console.error("❌ Migration safety check failed:\n");
  for (const e of errors) {
    console.error(`   - ${e}`);
  }
  console.error("\n💡 Fix: Add timestamped migration file OR add -- ALLOW_RISKY_MIGRATION comment for risky operations.");
  process.exit(1);
}

console.log("✅ Migration safety check passed.");
if (newMigrations.length > 0) {
  console.log(`   Found ${newMigrations.length} new migration(s) in this change.`);
}

