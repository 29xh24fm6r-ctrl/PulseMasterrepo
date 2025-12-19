/* eslint-disable no-console */
// scripts/guards/guard-no-notion-runtime.js
// Sprint 4.1: Guard against Notion runtime usage
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
  const rel = path.relative(ROOT, fp);
  const txt = read(fp);

  // Check for Notion usage
  const usesNotion =
    txt.includes("@notionhq/client") ||
    txt.includes("NOTION_DATABASE_") ||
    (txt.match(/\bnotion\b/i) && !txt.match(/notion.*deprecated|notion.*410|notion.*gone/i));

  if (!usesNotion) continue;

  // Allowed locations
  const allowed =
    rel.startsWith("scripts/") ||
    rel.startsWith("lib/importers/") ||
    rel.includes("migrate-notion") ||
    rel.includes("deprecated") ||
    rel.includes("410") ||
    rel.includes("gone") ||
    rel.includes("guards/guard-no-notion-runtime.js"); // Exclude guard script itself

  if (!allowed) {
    hits.push({ file: rel, reason: "Notion usage found in runtime code" });
  }
}

if (hits.length) {
  console.error("❌ guard-no-notion-runtime FAILED:");
  for (const h of hits) console.error(`  - ${h.file}: ${h.reason}`);
  process.exit(1);
}

console.log("✅ guard-no-notion-runtime OK");
process.exit(0);

