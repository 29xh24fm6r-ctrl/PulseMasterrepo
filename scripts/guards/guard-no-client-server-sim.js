// scripts/guards/guard-no-client-server-sim.js
// Prevents client components from importing server-only simulation code

import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();

const SCAN_DIRS = ["app", "components"];
const IGNORE_DIRS = new Set(["node_modules", ".next", ".git", "dist", "build", "out", ".turbo", "scripts"]);

const FORBIDDEN_PATTERNS = [
  /from\s+["']@\/lib\/simulation\/server/,
  /from\s+["']\.\.\/.*simulation\/server/,
  /from\s+["']@\/lib\/agi/,
  /import\s+.*from\s+["']@\/lib\/agi/,
];

const EXT_OK = new Set([".ts", ".tsx", ".js", ".jsx"]);

function walk(dirAbs, out = []) {
  if (!fs.existsSync(dirAbs)) return out;

  for (const ent of fs.readdirSync(dirAbs, { withFileTypes: true })) {
    const pAbs = path.join(dirAbs, ent.name);

    if (ent.isDirectory()) {
      if (IGNORE_DIRS.has(ent.name)) continue;
      walk(pAbs, out);
    } else {
      const ext = path.extname(ent.name);
      if (EXT_OK.has(ext)) out.push(pAbs);
    }
  }

  return out;
}

function read(fpAbs) {
  try {
    return fs.readFileSync(fpAbs, "utf8");
  } catch {
    return "";
  }
}

function rel(fpAbs) {
  return path.relative(ROOT, fpAbs).replace(/\\/g, "/");
}

function isClientFile(src) {
  // Check for "use client" directive
  return /^["']use\s+client["']/m.test(src);
}

const violations = [];

for (const d of SCAN_DIRS) {
  const dirAbs = path.join(ROOT, d);
  const files = walk(dirAbs);

  for (const fpAbs of files) {
    const fpRel = rel(fpAbs);
    const src = read(fpAbs);

    if (!isClientFile(src)) continue; // Only check client files

    // Check for forbidden imports
    for (const pattern of FORBIDDEN_PATTERNS) {
      if (pattern.test(src)) {
        violations.push({
          file: fpRel,
          pattern: pattern.toString(),
        });
        break; // Only report once per file
      }
    }
  }
}

if (!violations.length) {
  console.log("✅ guard-no-client-server-sim: no client imports of server-only simulation code found.");
  process.exit(0);
}

console.log("❌ guard-no-client-server-sim FAILED:");
for (const v of violations) {
  console.log(`  - ${v.file}: imports server-only simulation/AGI code`);
}

console.log(
  "\nFix:\n" +
    "- Remove imports of @/lib/simulation/server/* from client components\n" +
    "- Remove imports of @/lib/agi/* from client components\n" +
    "- Use API routes (/api/simulation/*) instead of direct imports\n"
);

process.exit(1);

