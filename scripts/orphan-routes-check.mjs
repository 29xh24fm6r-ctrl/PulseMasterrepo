#!/usr/bin/env node
/**
 * CI Guard: Orphan Routes Check
 * 
 * Prevents merges if there are nav links pointing to missing pages.
 * 
 * Usage:
 *   npm run orphan:check
 * 
 * Exit codes:
 *   0 = No orphan routes found
 *   1 = Orphan routes found
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, "..");

function walk(dir) {
  const out = [];
  if (!fs.existsSync(dir)) return out;
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, ent.name);
    if (ent.isDirectory()) {
      out.push(...walk(p));
    } else {
      out.push(p);
    }
  }
  return out;
}

function existsAppRoute(href) {
  // only validate internal app routes like /foo, /foo/bar
  if (!href.startsWith("/")) return true;
  if (href.startsWith("http")) return true;

  const clean = href.split("?")[0].split("#")[0];
  
  // Skip dynamic routes (we can't know)
  if (clean.includes("[") || clean.includes(":")) return true;
  
  // Skip static assets (icons, images, etc.)
  if (clean.includes("/icons/") || clean.includes("/images/") || clean.includes("/assets/")) return true;
  
  // Skip API routes (they're validated separately)
  if (clean.startsWith("/api/")) return true;

  const routePath = clean === "/" ? "" : clean;
  
  // Check in app/ directly
  const asPage = path.join(ROOT, "app", routePath, "page.tsx");
  const asRoute = path.join(ROOT, "app", routePath, "route.ts");
  const asIndexPage = path.join(ROOT, "app", routePath, "page.ts");
  
  if (fs.existsSync(asPage) || fs.existsSync(asRoute) || fs.existsSync(asIndexPage)) {
    return true;
  }
  
  // Check in route groups (Next.js route groups like (pulse), (authenticated))
  const appDir = path.join(ROOT, "app");
  if (fs.existsSync(appDir)) {
    const entries = fs.readdirSync(appDir, { withFileTypes: true });
    for (const ent of entries) {
      // Check route groups (folders starting with ())
      if (ent.isDirectory() && ent.name.startsWith("(")) {
        const groupPage = path.join(appDir, ent.name, routePath, "page.tsx");
        const groupRoute = path.join(appDir, ent.name, routePath, "route.ts");
        const groupIndexPage = path.join(appDir, ent.name, routePath, "page.ts");
        
        if (fs.existsSync(groupPage) || fs.existsSync(groupRoute) || fs.existsSync(groupIndexPage)) {
          return true;
        }
      }
    }
  }
  
  // Also check if it's a directory that might have an index
  const asDir = path.join(ROOT, "app", routePath);
  if (fs.existsSync(asDir) && fs.statSync(asDir).isDirectory()) {
    const asDirPage = path.join(asDir, "page.tsx");
    if (fs.existsSync(asDirPage)) return true;
  }

  return false;
}

function findInternalLinksInFile(fp) {
  const txt = fs.readFileSync(fp, "utf8");
  const hrefs = [];

  // capture href="/something"
  for (const m of txt.matchAll(/href\s*=\s*["'](\/[^"']+)["']/g)) {
    hrefs.push(m[1]);
  }

  // capture fetch("/api/...") - but skip these, they're API calls
  // for (const m of txt.matchAll(/fetch\s*\(\s*["'](\/[^"']+)["']/g)) {
  //   hrefs.push(m[1]);
  // }

  return hrefs;
}

const files = walk(path.join(ROOT, "app"))
  .concat(walk(path.join(ROOT, "components")))
  .filter((f) => f.endsWith(".ts") || f.endsWith(".tsx"));

const all = new Set();
for (const fp of files) {
  for (const href of findInternalLinksInFile(fp)) {
    all.add(href);
  }
}

const candidates = Array.from(all).filter((h) => h.startsWith("/") && !h.startsWith("/api/"));

const missing = candidates.filter((href) => !existsAppRoute(href));

if (missing.length) {
  console.error("❌ Orphan route references found:\n");
  for (const m of missing) {
    console.error(`   - ${m}`);
  }
  console.error("\n💡 Fix: Create the missing page or remove the link.");
  console.error("   See: lib/features/registry.ts for registered features.");
  process.exit(1);
}

console.log("✅ Orphan routes check passed.");
console.log(`   Checked ${candidates.length} route references.`);

