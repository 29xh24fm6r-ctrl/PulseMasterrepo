/* eslint-disable no-console */
import * as fs from "fs";
import * as path from "path";

// Scans app/api routes (route.ts / route.tsx) for potential unscoped Supabase queries.
// This is a heuristic audit: it flags `.from(...)` usage that doesn't appear to include owner_user_id scoping nearby.

const ROOT = process.cwd();
const API_DIR = path.join(ROOT, "app", "api");

type Finding = {
  file: string;
  line: number;
  message: string;
  snippet: string;
};

function walk(dir: string, out: string[] = []): string[] {
  if (!fs.existsSync(dir)) return out;
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const e of entries) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, out);
    else out.push(p);
  }
  return out;
}

function readLines(filePath: string): string[] {
  return fs.readFileSync(filePath, "utf8").split(/\r?\n/);
}

function isRouteFile(filePath: string) {
  return filePath.endsWith(`${path.sep}route.ts`) || filePath.endsWith(`${path.sep}route.tsx`);
}

function looksLikeSupabaseQuery(line: string) {
  return line.includes(".from(");
}

function hasOwnerFilterNearby(lines: string[], idx: number) {
  const window = lines
    .slice(Math.max(0, idx - 8), Math.min(lines.length, idx + 20))
    .join("\n");

  const patterns = [
    '.eq("owner_user_id"',
    ".eq('owner_user_id'",
    '.eq("ownerUserId"',
    ".eq('ownerUserId'",
    ".match({ owner_user_id:",
    ".match({owner_user_id:",
    "owner_user_id:",
    "resolveCanonicalContactId(",
    "auth()",
    "clerkUserId",
  ];

  return patterns.some((p) => window.includes(p));
}

function scanRoute(filePath: string): Finding[] {
  const rel = path.relative(ROOT, filePath);
  const lines = readLines(filePath);
  const findings: Finding[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (!looksLikeSupabaseQuery(line)) continue;

    if (!hasOwnerFilterNearby(lines, i)) {
      findings.push({
        file: rel,
        line: i + 1,
        message: "Supabase query may be missing owner_user_id scoping near this .from(...) call.",
        snippet: line.trim(),
      });
    }
  }

  return findings;
}

function main() {
  const all = walk(API_DIR).filter(isRouteFile);

  const findings: Finding[] = [];
  for (const f of all) {
    try {
      findings.push(...scanRoute(f));
    } catch (err) {
      console.error(`[audit-owner-filter] Failed reading ${f}:`, err);
    }
  }

  if (findings.length === 0) {
    console.log("✅ No suspicious unscoped Supabase queries found in app/api route handlers.");
    process.exit(0);
  }

  console.log(`⚠️ Found ${findings.length} potential issues:\n`);
  for (const x of findings) {
    console.log(`${x.file}:${x.line} — ${x.message}`);
    console.log(`  ${x.snippet}\n`);
  }

  process.exit(1);
}

main();
