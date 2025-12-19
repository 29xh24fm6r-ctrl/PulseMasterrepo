/* eslint-disable no-console */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const root = path.resolve(__dirname, "..");

// -------------------- helpers --------------------

function walk(dir) {
  const out = [];
  if (!fs.existsSync(dir)) return out;
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, ent.name);
    if (ent.isDirectory()) out.push(...walk(p));
    else out.push(p);
  }
  return out;
}

function toPosix(p) {
  return p.split(path.sep).join("/");
}

function stripExt(p) {
  return p.replace(/\.(tsx|ts|jsx|js)$/i, "");
}

function readText(fp) {
  return fs.readFileSync(fp, "utf8");
}

function safeIdFromHref(href) {
  return href
    .replace(/^\/+/, "")
    .replace(/\/+$/, "")
    .replace(/[^\w/.-]/g, "")
    .replace(/\//g, "-")
    .replace(/^-+|-+$/g, "") || "root";
}

function isDynamicSeg(seg) {
  return seg.startsWith("[") && seg.endsWith("]");
}

function isRouteGroup(seg) {
  return seg.startsWith("(") && seg.endsWith(")");
}

function cleanAppSegments(segments) {
  // remove route groups like (marketing)
  return segments.filter((s) => !isRouteGroup(s));
}

function hrefFromAppPath(appRelNoExt) {
  // app/foo/bar/page -> /foo/bar
  // app/page -> /
  // ignore internal segments like _components (rare) if present
  const parts = appRelNoExt.split("/").filter(Boolean);

  // parts starts with "app"
  const segs = parts.slice(1);

  // if ends with "page" or "route"
  const end = segs[segs.length - 1];
  const dirSegs = end === "page" || end === "route" ? segs.slice(0, -1) : segs;

  const cleaned = cleanAppSegments(dirSegs);

  // If any dynamic seg exists, keep href but flag dynamic later
  const href = "/" + cleaned.join("/");
  return href === "/" ? "/" : href.replace(/\/+/g, "/");
}

function groupForHref(href) {
  if (href === "/" || href.startsWith("/home")) return "Core";
  if (href.startsWith("/settings") || href.startsWith("/voice-settings")) return "Settings";
  if (href.startsWith("/ops") || href.startsWith("/admin")) return "Ops";
  if (href.startsWith("/voice") || href.startsWith("/jarvis")) return "Voice";
  if (href.startsWith("/contacts") || href.startsWith("/relationships") || href.startsWith("/follow-ups")) return "Relationships";
  if (href.startsWith("/deals") || href.startsWith("/work") || href.startsWith("/frontier")) return "Work";
  if (href.startsWith("/labs")) return "Labs";
  return "Core";
}

function defaultNameFromHref(href) {
  if (href === "/") return "Root";
  const parts = href.replace(/^\/+/, "").split("/").filter(Boolean);
  const title = parts
    .map((p) => p.replace(/[-_]/g, " "))
    .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
    .join(" / ");
  return title || "Root";
}

function isIgnoredHref(href) {
  // ignore Next internals and special routes
  const ignorePrefixes = ["/_next", "/favicon", "/robots", "/sitemap", "/api"];
  if (ignorePrefixes.some((p) => href.startsWith(p))) return true;

  // ignore auth/callback routes if you don't want them in Feature Hub (adjust as needed)
  const ignoreExact = new Set([
    "/sign-in",
    "/sign-up",
    "/clerk",
  ]);

  return ignoreExact.has(href);
}

const IGNORE_API_PATH_PREFIXES = [
  "/api/notion",
];

function isIgnoredApi(apiPath) {
  // You can ignore webhooks/internal if desired
  const ignorePrefixes = ["/api/_", "/api/internal", ...IGNORE_API_PATH_PREFIXES];
  return ignorePrefixes.some((p) => apiPath.startsWith(p));
}

function looksDynamicHref(href) {
  return href.includes("[") || href.includes("]");
}

function looksDynamicApi(apiPath) {
  return apiPath.includes("[") || apiPath.includes("]");
}

function extractApiCallsFromText(txt) {
  const apis = [];

  // fetch("/api/...")
  for (const m of txt.matchAll(/fetch\s*\(\s*["'`](\/api\/[^"'`\s)]+)["'`]/g)) {
    apis.push({ method: "GET", api: m[1] });
  }

  // useSWR("/api/...")
  for (const m of txt.matchAll(/useSWR(?:Immutable)?\s*\(\s*["'`](\/api\/[^"'`\s)]+)["'`]/g)) {
    apis.push({ method: "GET", api: m[1] });
  }

  // axios.get("/api/..."), axios.post...
  for (const m of txt.matchAll(/axios\.(get|post|put|patch|delete)\s*\(\s*["'`](\/api\/[^"'`\s)]+)["'`]/gi)) {
    apis.push({ method: m[1].toUpperCase(), api: m[2] });
  }

  // generic: "/api/..." in request helpers (conservative)
  for (const m of txt.matchAll(/["'`](\/api\/[^"'`\s)]+)["'`]/g)) {
    // only keep if it looks like a direct endpoint string, not a random string
    const v = m[1];
    if (v.startsWith("/api/")) apis.push({ method: "GET", api: v });
  }

  // De-dupe within file
  const seen = new Set();
  const out = [];
  for (const a of apis) {
    const k = `${a.method}:${a.api}`;
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(a);
  }
  return out;
}

function findNearestOwningHrefForFile(fileRelPosix, allFiles) {
  // If the file lives under app/, attribute to its route tree.
  // app/(group)/x/y/page.tsx => owner href /x
  if (!fileRelPosix.startsWith("app/")) return null;

  const parts = fileRelPosix.split("/");
  // walk upwards to find nearest page.tsx in ancestor dirs
  for (let i = parts.length; i >= 1; i--) {
    const candidateDir = parts.slice(0, i).join("/");
    const candidatePageTsx = `${candidateDir}/page.tsx`;
    const candidatePageTs = `${candidateDir}/page.ts`;
    if (allFiles.includes(candidatePageTsx) || allFiles.includes(candidatePageTs)) {
      const noExt = stripExt(candidatePageTsx);
      const href = hrefFromAppPath(noExt);
      return href;
    }
  }

  // fallback: derive from its app path
  const noExt = stripExt(fileRelPosix);
  const href = hrefFromAppPath(noExt);
  return href || null;
}

// -------------------- scan --------------------

const appDir = path.join(root, "app");
const libDir = path.join(root, "lib", "features");
fs.mkdirSync(libDir, { recursive: true });

const files = walk(appDir).map(toPosix);

// pages: app/**/page.tsx
const pageFiles = files.filter((f) => f.endsWith("/page.tsx") || f.endsWith("/page.ts"));
// api routes: app/api/**/route.ts
const apiFiles = files.filter((f) => f.includes("/app/api/") && (f.endsWith("/route.ts") || f.endsWith("/route.js")));

// Scan for API calls in app, components, lib
const scanRoots = ["app", "components", "lib"];
const scanFiles = scanRoots
  .flatMap((d) => {
    const dirPath = path.join(root, d);
    if (!fs.existsSync(dirPath)) return [];
    return walk(dirPath).map(toPosix);
  })
  .filter((f) => f.endsWith(".ts") || f.endsWith(".tsx"));

// build page href list
const pages = [];
for (const fp of pageFiles) {
  const rel = toPosix(path.relative(root, fp));
  const noExt = stripExt(rel);
  const href = hrefFromAppPath(noExt);
  if (isIgnoredHref(href)) continue;

  pages.push({
    href,
    file: rel,
    dynamic: looksDynamicHref(rel) || href.includes("["),
  });
}

// build api route path list
const apis = [];
for (const fp of apiFiles) {
  const rel = toPosix(path.relative(root, fp));
  const noExt = stripExt(rel);
  const apiPath = hrefFromAppPath(noExt); // yields /api/...
  if (isIgnoredApi(apiPath)) continue;

  apis.push({
    path: apiPath,
    file: rel,
    dynamic: looksDynamicApi(rel) || apiPath.includes("["),
    // naive method discovery
    methods: (() => {
      const txt = readText(fp);
      const ms = [];
      for (const m of ["GET", "POST", "PATCH", "PUT", "DELETE"]) {
        if (new RegExp(`export\\s+async\\s+function\\s+${m}\\b`).test(txt) || new RegExp(`export\\s+function\\s+${m}\\b`).test(txt)) {
          ms.push(m);
        }
      }
      return ms.length ? ms : ["GET"];
    })(),
  });
}

// Deduplicate hrefs (pick the shortest file path as primary)
const pageMap = new Map();
for (const p of pages) {
  const existing = pageMap.get(p.href);
  if (!existing || p.file.length < existing.file.length) pageMap.set(p.href, p);
}

// Group pages into features (one feature per base route)
function featureKeyForHref(href) {
  // treat /deals and /deals/[id] as deals (base /deals)
  const parts = href.split("/").filter(Boolean);
  if (parts.length === 0) return "/";
  // pick first segment as feature root by default
  return "/" + parts[0];
}

const featuresByKey = new Map();

// Add page links into feature buckets
for (const p of pageMap.values()) {
  const key = featureKeyForHref(p.href);
  if (!featuresByKey.has(key)) {
    featuresByKey.set(key, {
      key,
      links: [],
      pages: [],
    });
  }
  const f = featuresByKey.get(key);
  f.pages.push(p);
  // Label: "Open" if equals key or is root page; else last segment title
  const label =
    p.href === key || (key === "/" && p.href === "/")
      ? "Open"
      : defaultNameFromHref(p.href).split(" / ").slice(-1)[0];
  f.links.push({ label, href: p.href });
}

// Attach APIs into buckets by first segment after /api
function apiKeyForPath(apiPath) {
  const parts = apiPath.split("/").filter(Boolean); // ['api','tasks',...]
  if (parts[0] !== "api") return "/api";
  const seg = parts[1] || "";
  return seg ? `/${seg}` : "/api";
}

for (const a of apis) {
  const k = apiKeyForPath(a.path); // e.g. /tasks
  // Attach to feature root if it exists; else create a pseudo feature
  if (!featuresByKey.has(k)) {
    featuresByKey.set(k, { key: k, links: [], pages: [], apis: [] });
  }
  const f = featuresByKey.get(k);
  if (!f.apis) f.apis = [];
  for (const method of a.methods) {
    f.apis.push({
      method,
      path: a.path.replace(/\[([^\]]+)\]/g, ":$1"), // /api/tasks/[id] -> /api/tasks/:id
      ping: ["GET"].includes(method) && !a.dynamic, // conservative default
    });
  }
}

// Build set of known API paths
const knownApiPaths = new Set(apis.map((a) => a.path));

// -------------------- observe API calls from source --------------------

const observedByFeatureKey = new Map(); // featureKey -> FeatureApi[]
const missingApis = [];                // { caller_file, api }
const unownedCalls = [];               // { caller_file, api }

for (const fp of scanFiles) {
  const rel = toPosix(path.relative(root, fp));
  const txt = readText(fp);
  const calls = extractApiCallsFromText(txt);

  if (!calls.length) continue;

  const ownerHref = findNearestOwningHrefForFile(rel, files);
  const ownerKey = ownerHref ? featureKeyForHref(ownerHref) : null;

  for (const c of calls) {
    const apiPath = c.api;

    // Skip ignored API paths (e.g., /api/notion)
    if (IGNORE_API_PATH_PREFIXES.some((p) => apiPath.startsWith(p))) continue;

    // Normalize dynamic segments for matching known APIs:
    // /api/tasks/123 -> /api/tasks/[id] is hard to infer reliably; we treat it as "exists" if any known API starts with /api/tasks
    const apiBase = apiPath.split("?")[0].split("#")[0];

    const exists =
      knownApiPaths.has(apiBase) ||
      Array.from(knownApiPaths).some((k) => {
        // handle /api/foo/[id] style matching
        if (k.includes("[") && k.startsWith(apiBase.split("/").slice(0, 3).join("/"))) return true;
        // handle base prefix match: /api/tasks matches /api/tasks/anything
        if (apiBase.startsWith(k + "/")) return true;
        return false;
      });

    if (!exists) {
      missingApis.push({ caller_file: rel, api: apiBase });
    }

    if (!ownerKey) {
      unownedCalls.push({ caller_file: rel, api: apiBase });
      continue;
    }

    if (!observedByFeatureKey.has(ownerKey)) observedByFeatureKey.set(ownerKey, []);
    observedByFeatureKey.get(ownerKey).push({
      method: c.method,
      path: apiBase.replace(/\/\d+(\b|\/)/g, "/:id$1"), // very light normalization
      ping: false,
    });
  }
}

// De-dupe observed API lists
for (const [k, list] of observedByFeatureKey.entries()) {
  const seen = new Set();
  const out = [];
  for (const a of list) {
    const kk = `${a.method}:${a.path}`;
    if (seen.has(kk)) continue;
    seen.add(kk);
    out.push(a);
  }
  observedByFeatureKey.set(k, out);
}

// Compute unused APIs (API routes never called anywhere)
const observedApiSet = new Set();
for (const arr of observedByFeatureKey.values()) {
  for (const a of arr) observedApiSet.add(a.path.split("?")[0]);
}

const unusedDefinedApis = [];
for (const k of knownApiPaths) {
  // if no observed call starts with this api root, it may be unused
  const used = Array.from(observedApiSet).some((x) => x === k || x.startsWith(k + "/"));
  if (!used) unusedDefinedApis.push({ api: k });
}

// Build final FeatureDef list
const featureList = [];
for (const [key, f] of featuresByKey.entries()) {
  // skip empty features
  const hasLinks = f.links && f.links.length > 0;
  const hasApis = f.apis && f.apis.length > 0;
  if (!hasLinks && !hasApis) continue;

  // If no page links but has APIs, keep it but mark hidden
  const status = hasLinks ? "core" : "hidden";
  const group = groupForHref(key);

  // primary href for naming
  const primaryHref = hasLinks ? f.links[0].href : key;
  const name = defaultNameFromHref(primaryHref);

  const id = safeIdFromHref(key);

  // de-dupe links by href
  const seenHref = new Set();
  const links = (f.links || []).filter((l) => {
    if (seenHref.has(l.href)) return false;
    seenHref.add(l.href);
    return true;
  });

  // de-dupe apis by method+path
  const seenApi = new Set();
  const apisOut = (f.apis || []).filter((a) => {
    const k = `${a.method}:${a.path}`;
    if (seenApi.has(k)) return false;
    seenApi.add(k);
    return true;
  });

  const observed = observedByFeatureKey.get(key) || [];

  // Collect diagnostics for this feature
  const featureMissingApis = missingApis.filter((m) => {
    const ownerHref = findNearestOwningHrefForFile(m.caller_file, files);
    const ownerKey = ownerHref ? featureKeyForHref(ownerHref) : null;
    return ownerKey === key;
  });

  const featureUnownedCalls = unownedCalls.filter((u) => {
    // Only include if the file is somehow related to this feature (best effort)
    return u.caller_file.includes(key.replace("/", ""));
  });

  featureList.push({
    id,
    name,
    description: "",
    status,
    group,
    links,
    apis: apisOut.length ? apisOut : undefined,
    observed_apis: observed.length ? observed : undefined,
    diagnostics: {
      missing_apis: featureMissingApis.length > 0 ? featureMissingApis.slice(0, 50) : undefined,
      unowned_calls: featureUnownedCalls.length > 0 ? featureUnownedCalls.slice(0, 50) : undefined,
      unused_defined_apis: unusedDefinedApis.length > 0 ? unusedDefinedApis.slice(0, 50) : undefined,
    },
  });
}

// Add global diagnostics to a special "system" feature or attach to first feature
if (featureList.length > 0 && (missingApis.length > 0 || unownedCalls.length > 0 || unusedDefinedApis.length > 0)) {
  // Find or create a "system" diagnostics feature
  let systemFeature = featureList.find((f) => f.id === "system" || f.id === "features");
  if (!systemFeature) {
    systemFeature = {
      id: "system",
      name: "System Diagnostics",
      description: "Global API usage diagnostics",
      status: "hidden",
      group: "Ops",
      links: [],
      apis: undefined,
      observed_apis: undefined,
      diagnostics: {},
    };
    featureList.push(systemFeature);
  }
  systemFeature.diagnostics = {
    missing_apis: missingApis.slice(0, 200),
    unowned_calls: unownedCalls.slice(0, 200),
    unused_defined_apis: unusedDefinedApis.slice(0, 200),
  };
}

// Sort stable
featureList.sort((a, b) => {
  if (a.group !== b.group) return a.group.localeCompare(b.group);
  return a.name.localeCompare(b.name);
});

// -------------------- emit --------------------

const outFile = path.join(root, "lib", "features", "registry.generated.ts");

const header = `/**
 * AUTO-GENERATED FILE — DO NOT EDIT
 * Generated by scripts/generate-feature-registry.mjs
 * 
 * Edit names/descriptions/status overrides in lib/features/registry.manual.ts instead.
 */

`;

const content =
  header +
  `
import type { FeatureDef } from "./types";

export const GENERATED_FEATURES: FeatureDef[] = ${JSON.stringify(featureList, null, 2)} as any;
`;

fs.writeFileSync(outFile, content, "utf8");
console.log(`✅ Wrote ${toPosix(path.relative(root, outFile))} (${featureList.length} features)`);

