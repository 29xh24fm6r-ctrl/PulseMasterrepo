import fs from "fs";
import path from "path";

const ROOT = process.cwd();

function exists(p) {
    try {
        return fs.existsSync(p);
    } catch {
        return false;
    }
}

const APP_DIR = exists(path.join(ROOT, "src", "app"))
    ? path.join(ROOT, "src", "app")
    : path.join(ROOT, "app");

function walk(dir) {
    const out = [];
    if (!exists(dir)) return out;
    for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
        const p = path.join(dir, ent.name);
        if (ent.isDirectory()) out.push(...walk(p));
        else out.push(p);
    }
    return out;
}

function normalize(p) {
    return p.replace(/\\/g, "/");
}

function extractApiCalls(text) {
    const patterns = [
        /fetch\(\s*["'](\/api\/[^"']+)["']/g,
        /axios\.\w+\(\s*["'](\/api\/[^"']+)["']/g,
        /axios\(\s*["'](\/api\/[^"']+)["']/g,
    ];
    const calls = [];
    for (const re of patterns) {
        let m;
        while ((m = re.exec(text))) calls.push(m[1]);
    }
    return calls;
}

function toApiFromRouteFile(file) {
    // file is already normalized to forward slashes
    const rel = normalize(path.relative(APP_DIR, file)); // api/foo/route.ts
    if (!rel.startsWith("api/")) return null;
    if (!rel.endsWith("/route.ts")) return null;
    return "/" + rel.replace(/\/route\.ts$/, "");
}

// Walk the actual app dir (src/app or app) and normalize immediately
const files = walk(APP_DIR).map(normalize);

const apiRoutes = new Set(
    files
        .filter((f) => f.endsWith("/route.ts") && f.includes("/api/"))
        .map(toApiFromRouteFile)
        .filter(Boolean)
);

const codeFiles = files.filter((f) => /\.(ts|tsx|js|jsx)$/.test(f));
const refs = new Map(); // endpoint -> list of files

for (const f of codeFiles) {
    const txt = fs.readFileSync(f, "utf8");
    const calls = extractApiCalls(txt);
    for (const c of calls) {
        if (!refs.has(c)) refs.set(c, []);
        refs.get(c).push(normalize(path.relative(ROOT, f)));
    }
}

// Normalize referenced endpoints by stripping querystrings
const referenced = [...refs.keys()]
    .map((e) => e.split("?")[0])
    .sort();

const apiRoutesArr = [...apiRoutes].sort();
const missing = referenced.filter((e) => !apiRoutes.has(e));

const report = {
    detectedAppRoot: normalize(path.relative(ROOT, APP_DIR)),
    counts: {
        apiRoutes: apiRoutes.size,
        referencedApiCalls: referenced.length,
        missingApiRoutes: missing.length,
    },
    missingApiRoutes: missing.map((endpoint) => ({
        endpoint,
        referencedBy: refs.get(endpoint) || [],
    })),
    sample: {
        apiRoutesFirst20: apiRoutesArr.slice(0, 20),
    },
};

fs.writeFileSync(path.join(ROOT, "audit.parity.json"), JSON.stringify(report, null, 2));
console.log("Wrote audit.parity.json");
console.log(JSON.stringify(report.counts, null, 2));

if (missing.length > 0) {
    console.error(`Missing API routes detected: ${missing.length}`);
    process.exit(2);
}
