// scripts/guards/guard-no-dead-links.mjs
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

/**
 * Dead Link Guard (local / CI)
 *
 * What it checks:
 * - Reads FEATURE_REGISTRY (src/lib/features/registry.ts)
 * - Extracts every `href: "/..."` literal
 * - Verifies the target route exists in either:
 *    - App Router: app/{path}/page.tsx|page.ts|page.jsx|page.js
 *    - Pages Router: pages/{path}.tsx|.ts|.jsx|.js (including index.*)
 *
 * Notes:
 * - Only checks internal links starting with "/"
 * - Ignores external links (http/https)
 * - Ignores dynamic routes if the target is a concrete page (e.g., /deals is OK even if /deals/[id] exists)
 */

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, "../..");

function die(msg) {
  console.error(`\n❌ DEAD LINK GUARD FAILED\n${msg}\n`);
  process.exit(1);
}

function warn(msg) {
  console.warn(`⚠️  ${msg}`);
}

function fileExists(p) {
  try {
    return fs.existsSync(p);
  } catch {
    return false;
  }
}

function isDir(p) {
  try {
    return fs.statSync(p).isDirectory();
  } catch {
    return false;
  }
}

function readText(p) {
  return fs.readFileSync(p, "utf8");
}

function normHref(href) {
  // normalize "/x/" => "/x"
  if (!href) return href;
  if (href.length > 1 && href.endsWith("/")) return href.slice(0, -1);
  return href;
}

function routeToAppDir(href) {
  // "/features" => "app/features"
  // "/" => "app"
  const clean = href === "/" ? "" : href.replace(/^\//, "");
  return path.join(REPO_ROOT, "app", clean);
}

function routeToPagesCandidates(href) {
  // Pages router:
  // "/features" => pages/features.tsx OR pages/features/index.tsx
  // "/" => pages/index.tsx
  const clean = href === "/" ? "index" : href.replace(/^\//, "");
  const base = path.join(REPO_ROOT, "pages");

  const exts = [".tsx", ".ts", ".jsx", ".js"];

  const direct = exts.map((ext) => path.join(base, `${clean}${ext}`));
  const indexish = exts.map((ext) => path.join(base, clean, `index${ext}`));

  return [...direct, ...indexish];
}

function appRouterHasPage(href) {
  const dir = routeToAppDir(href);

  // If the exact directory exists, check for page.* within it.
  const exts = [".tsx", ".ts", ".jsx", ".js"];
  const pageCandidates = exts.map((ext) => path.join(dir, `page${ext}`));

  for (const p of pageCandidates) {
    if (fileExists(p)) return true;
  }

  // Special case: app/page.tsx for "/"
  if (href === "/") {
    const root = path.join(REPO_ROOT, "app");
    for (const ext of exts) {
      const p = path.join(root, `page${ext}`);
      if (fileExists(p)) return true;
    }
  }

  return false;
}

function pagesRouterHasPage(href) {
  const candidates = routeToPagesCandidates(href);
  return candidates.some(fileExists);
}

function routeExists(href) {
  // We only validate concrete routes (no query, no hash)
  const clean = href.split("?")[0].split("#")[0];
  if (!clean.startsWith("/")) return true;

  // App Router
  if (appRouterHasPage(clean)) return true;

  // Pages Router
  if (pagesRouterHasPage(clean)) return true;

  return false;
}

function extractFeatureHrefsFromRegistry() {
  const registryPath = path.join(REPO_ROOT, "lib", "features", "registry.ts");
  if (!fileExists(registryPath)) {
    die(`Missing registry file at: ${registryPath}\nExpected: lib/features/registry.ts`);
  }

  const txt = readText(registryPath);

  // Extract href literals: href: "/something"
  // This is intentionally strict + simple (no AST) to keep it stable.
  const re = /href:\s*["'`]([^"'`]+)["'`]/g;

  const hrefs = [];
  let m;
  while ((m = re.exec(txt)) !== null) {
    hrefs.push(m[1]);
  }

  const internal = hrefs
    .map(normHref)
    .filter((h) => typeof h === "string" && h.startsWith("/"))
    .filter((h) => !h.startsWith("//"));

  // Ignore obvious externals
  const filtered = internal.filter((h) => !h.startsWith("/http") && !h.startsWith("/https"));

  return Array.from(new Set(filtered));
}

function main() {
  const hrefs = extractFeatureHrefsFromRegistry();

  if (!hrefs.length) {
    die(`No hrefs found in lib/features/registry.ts.\nExpected entries like: href: "/features"`);
  }

  const missing = [];
  for (const href of hrefs) {
    // Skip wildcard-ish (we don't expect these in feature registry)
    if (href.includes("*")) continue;

    const ok = routeExists(href);
    if (!ok) missing.push(href);
  }

  if (missing.length) {
    const msg =
      `These FEATURE_REGISTRY href(s) do not resolve to a route:\n` +
      missing.map((h) => `  - ${h}`).join("\n") +
      `\n\nFix options:\n` +
      `  1) Create the route page at app${missing[0] === "/" ? "" : missing[0]}/page.tsx (App Router)\n` +
      `  2) Or create a Pages Router file at pages/... that matches\n` +
      `  3) Or update FEATURE_REGISTRY href to a real route\n`;
    die(msg);
  }

  console.log(`✅ Dead Link Guard passed. Checked ${hrefs.length} feature href(s).`);
}

main();

