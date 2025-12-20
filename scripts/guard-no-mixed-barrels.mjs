// scripts/guard-no-mixed-barrels.mjs
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const LIB_DIR = path.join(ROOT, "lib");

// Only scan barrels inside lib/
const BARREL_NAMES = new Set(["index.ts", "index.tsx"]);

const FORBIDDEN = [
  'import "server-only"',
  "@clerk/nextjs/server",
  "next/headers",
  "cookies(",
  "headers(",
];

function walk(dir, out = []) {
  if (!fs.existsSync(dir)) return out;

  try {
    for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
      const p = path.join(dir, ent.name);
      if (ent.isDirectory()) {
        if (ent.name === "node_modules" || ent.name === ".next" || ent.name === ".git") continue;
        walk(p, out);
      } else if (BARREL_NAMES.has(ent.name)) {
        out.push(p);
      }
    }
  } catch (e) {
    // ignore permission errors
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

const barrels = walk(LIB_DIR);
const violations = [];

for (const fp of barrels) {
  const src = read(fp);

  for (const token of FORBIDDEN) {
    if (src.includes(token)) {
      violations.push({
        file: path.relative(ROOT, fp).replace(/\\/g, "/"),
        token,
      });
    }
  }
}

if (!violations.length) {
  console.log("✅ guard-no-mixed-barrels: no forbidden server-only tokens found in lib/**/index.ts barrels.");
  process.exit(0);
}

console.log(`❌ guard-no-mixed-barrels: found ${violations.length} violation(s) in lib/**/index.ts barrels:\n`);
for (const v of violations) {
  console.log(`- ${v.file}  (contains: ${JSON.stringify(v.token)})`);
}

console.log("\nFix: move server-only exports into lib/**/server.ts and keep index.ts client-safe.");
process.exit(1);

