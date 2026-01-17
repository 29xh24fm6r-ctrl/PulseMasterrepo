import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

const ROOT = process.cwd();
const APP_DIR = join(ROOT, "app");

// Patterns that should always be runtime-only.
// Adjust these once and the repo is permanently safe.
const PROTECTED_ROUTE_SEGMENTS = [
    "achievements",
    "autonomy",
    "dashboard",
    "settings",
    "profile",
    "vault",
    "brain",
    "chef",
    "xp",
    "calendar",
    "life", // Dashboard
    "identity",
    "bridge", // Command Center
    "pulse",
];

function walk(dir: string): string[] {
    const out: string[] = [];
    try {
        const entries = readdirSync(dir);
        for (const entry of entries) {
            const full = join(dir, entry);
            const st = statSync(full);
            if (st.isDirectory()) out.push(...walk(full));
            else out.push(full);
        }
    } catch (e) {
        // Directory might not exist or other error, ignore
    }
    return out;
}

function isProtectedPage(file: string): boolean {
    if (!file.endsWith("page.tsx")) return false;
    const rel = file.replace(APP_DIR + "\\", "").replace(APP_DIR + "/", "");

    // Normalize path separators to forward slashes for easier matching
    const normalizedRel = rel.replace(/\\/g, "/");

    return PROTECTED_ROUTE_SEGMENTS.some((seg) =>
        normalizedRel.includes(`${seg}/`) ||
        normalizedRel.startsWith(`${seg}/`) ||
        normalizedRel === seg // exact match, unlikely for page.tsx but possible if seg is filename
    );
}

const pages = walk(APP_DIR).filter((p) => p.endsWith("page.tsx") || p.endsWith("not-found.tsx"));

const violations: string[] = [];

for (const f of pages) {
    const rel = f.replace(ROOT + "\\", "").replace(ROOT + "/", "");
    // Normalize path separators
    const normalizedRel = rel.replace(/\\/g, "/");

    const content = readFileSync(f, "utf8");

    const protectedByName =
        normalizedRel.endsWith("app/not-found.tsx") ||
        isProtectedPage(f);

    if (!protectedByName) continue;

    const ok = content.includes(`export const dynamic = "force-dynamic"`);

    if (!ok) violations.push(rel);
}

if (violations.length) {
    console.error("[VERIFY FAILED] Protected pages must be runtime-only. Add:");
    console.error(`  export const dynamic = "force-dynamic";`);
    console.error("\nViolations:");
    for (const v of violations) console.error(" - " + v);
    process.exit(1);
}

console.log("[OK] Protected pages are runtime-only (force-dynamic).");
