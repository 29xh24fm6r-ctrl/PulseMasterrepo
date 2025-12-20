// scripts/guards/guard-no-notion-runtime.js
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();

const SCAN_DIRS = ["app", "lib"];
const IGNORE_DIRS = new Set(["node_modules", ".next", ".git", "dist", "build", "out", ".turbo", "scripts"]);

const ALLOW_PREFIXES = [
  "lib/legacy/notion/", // legacy quarantine zone only
  "lib/notion-disabled.ts", // stub that mentions notion but is safe
  "lib/notion.ts", // stub that mentions notion but is safe
  "lib/notion/properties.ts", // stub that mentions notion but is safe
];

const EXT_OK = new Set([".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs"]);

// Patterns that indicate actual Notion usage (not just mentions)
const NOTION_PATTERNS = [
  /import\s+.*from\s+["']@notionhq\/client["']/, // actual Notion SDK import
  /import\s+.*\{.*Client.*\}\s+from\s+["']@notionhq\/client["']/, // Client import
  /require\(["']@notionhq\/client["']\)/, // require statement
  /new\s+Client\s*\(/, // new Client() instantiation
  /from\s+["']@\/app\/lib\/notion["']/, // old import path (should be removed)
  /NOTION_DATABASE_/, // Notion env var usage
  /NOTION_API_KEY/, // Notion API key usage
];

function walk(dirAbs, out = []) {
  if (!fs.existsSync(dirAbs)) return out;

  try {
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
  } catch (e) {
    // ignore permission errors
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

function isAllowed(fpRel) {
  return ALLOW_PREFIXES.some((pfx) => fpRel.startsWith(pfx));
}

const violations = [];

for (const d of SCAN_DIRS) {
  const dirAbs = path.join(ROOT, d);
  const files = walk(dirAbs);

  for (const fpAbs of files) {
    const fpRel = rel(fpAbs);

    if (isAllowed(fpRel)) continue;

    const src = read(fpAbs);
    // Check for actual Notion usage (patterns, not just word "notion")
    const hit = NOTION_PATTERNS.some((p) => {
      if (p instanceof RegExp) {
        return p.test(src);
      }
      return src.includes(p);
    });

    if (hit) {
      violations.push(fpRel);
    }
  }
}

if (!violations.length) {
  console.log("✅ guard-no-notion-runtime: no Notion usage found in runtime code.");
  process.exit(0);
}

console.log("❌ guard-no-notion-runtime FAILED:");
for (const v of violations) {
  console.log(`  - ${v}: Notion usage found in runtime code`);
}

console.log(
  "\nFix:\n" +
    "- Remove Notion imports/usages from app/ and lib/\n" +
    "- If legacy Notion code must remain, keep it only under lib/legacy/notion/\n" +
    "- Supabase is the official database.\n"
);

process.exit(1);
