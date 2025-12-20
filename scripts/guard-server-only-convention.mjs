// scripts/guard-server-only-convention.mjs
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const IGNORE_DIRS = new Set([
  "node_modules",
  ".next",
  ".git",
  "dist",
  "build",
  "out",
  ".turbo",
]);

const EXT_OK = new Set([".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs"]);
const TOKEN = 'import "server-only"';

function walk(dir, out = []) {
  if (!fs.existsSync(dir)) return out;
  try {
    for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
      const p = path.join(dir, ent.name);
      if (ent.isDirectory()) {
        if (IGNORE_DIRS.has(ent.name)) continue;
        walk(p, out);
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

function read(fp) {
  try {
    return fs.readFileSync(fp, "utf8");
  } catch {
    return "";
  }
}

function rel(fp) {
  return path.relative(ROOT, fp).replace(/\\/g, "/");
}

// Allowed locations for server-only marker
function isAllowed(fpRel) {
  // lib/**/*.ts(x) - any file in lib/ (except index.ts which is guarded by mixed-barrels)
  if (fpRel.startsWith("lib/") && /\.tsx?$/.test(fpRel) && !/\/index\.tsx?$/.test(fpRel)) return true;

  // app/**/route.ts(x) - route handlers
  if (fpRel.startsWith("app/") && /\/route\.tsx?$/.test(fpRel)) return true;

  // scripts/** - guard scripts themselves can use server-only
  if (fpRel.startsWith("scripts/")) return true;

  // Optional: middleware.ts (uncomment if you ever intentionally use server-only there)
  // if (fpRel === "middleware.ts") return true;

  return false;
}

const files = walk(ROOT);
const violations = [];

for (const fp of files) {
  const src = read(fp);
  if (!src.includes(TOKEN)) continue;

  const fpRel = rel(fp);
  if (!isAllowed(fpRel)) {
    violations.push(fpRel);
  }
}

if (!violations.length) {
  console.log("✅ guard-server-only-convention: server-only marker only appears in approved locations.");
  process.exit(0);
}

console.log(`❌ guard-server-only-convention: found ${violations.length} violation(s):\n`);
for (const v of violations) console.log(`- ${v}`);

console.log(
  `\nFix:\n` +
    `- Move server-only implementations into lib/**/server.ts\n` +
    `- Or relocate logic into app/**/route.ts\n` +
    `- Remove 'import "server-only"' from non-approved files\n`
);

process.exit(1);

