import fs from "fs";
import path from "path";

const ROOT = process.cwd();

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

function toRouteFromPage(file) {
    // app/foo/bar/page.tsx -> /foo/bar
    const rel = file.replace(/\\/g, "/").replace(/^.*\/app\//, "");
    if (!rel.endsWith("/page.tsx")) return null;
    const route = "/" + rel.replace(/\/page\.tsx$/, "");
    return route === "/page" ? "/" : route;
}

function toApiFromRoute(file) {
    // app/api/foo/bar/route.ts -> /api/foo/bar
    const rel = file.replace(/\\/g, "/").replace(/^.*\/app\//, "");
    if (!rel.endsWith("/route.ts")) return null;
    return "/" + rel.replace(/\/route\.ts$/, "");
}

function extractApiCalls(text) {
    // very pragmatic extractor: fetch("/api/..") or fetch('/api/..')
    const re = /fetch\(\s*["'](\/api\/[^"']+)["']/g;
    const calls = [];
    let m;
    while ((m = re.exec(text))) calls.push(m[1]);
    return calls;
}

const files = walk(path.join(ROOT, "app"));

const pages = files
    .filter((f) => f.replace(/\\/g, "/").includes("/app/") && f.endsWith("/page.tsx"))
    .map(toRouteFromPage)
    .filter(Boolean)
    .sort();

const apis = files
    .filter((f) => f.replace(/\\/g, "/").includes("/app/api/") && f.endsWith("/route.ts"))
    .map(toApiFromRoute)
    .filter(Boolean)
    .sort();

const apiSet = new Set(apis);

const apiRefs = new Map(); // endpoint -> [files]
for (const f of files.filter((x) => x.endsWith(".ts") || x.endsWith(".tsx"))) {
    const txt = fs.readFileSync(f, "utf8");
    const calls = extractApiCalls(txt);
    for (const c of calls) {
        if (!apiRefs.has(c)) apiRefs.set(c, []);
        apiRefs.get(c).push(f.replace(ROOT + path.sep, ""));
    }
}

const referenced = [...apiRefs.keys()].sort();
const missing = referenced.filter((e) => !apiSet.has(e));

const report = {
    counts: { pages: pages.length, apis: apis.length, referencedApis: referenced.length, missingApis: missing.length },
    pages,
    apis,
    missingApis: missing.map((e) => ({ endpoint: e, referencedBy: apiRefs.get(e) })),
};

fs.writeFileSync(path.join(ROOT, "audit.report.json"), JSON.stringify(report, null, 2));
console.log("Wrote audit.report.json");
console.log(`Pages: ${pages.length}`);
console.log(`APIs: ${apis.length}`);
console.log(`Referenced APIs: ${referenced.length}`);
console.log(`Missing APIs: ${missing.length}`);
