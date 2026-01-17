import fs from "fs";
import path from "path";

const ROOT = process.cwd();
const APP_DIR = path.resolve(ROOT, "app");
const SERVICES_DIR = path.resolve(ROOT, "services");
const COMPONENTS_DIR = path.resolve(ROOT, "components");
const LIB_DIR = path.resolve(ROOT, "lib");

// Allowed directory for SDK imports
const ALLOWED_DIR = path.resolve(ROOT, "lib", "runtime");

const FORBIDDEN_PACKAGES = [
    "@supabase/supabase-js",
    "stripe",
    "resend",
    "openai",
    "google-auth-library"
];

const FORBIDDEN_PATTERNS = [
    // Also ban imports of the service wrappers themselves if they are not the runtime ones
    // We want to force usage of lib/runtime
];

function checkContent(filePath: string, content: string) {
    for (const pkg of FORBIDDEN_PACKAGES) {
        // We want to forbid value imports but ALLOW type imports.
        // Naive check: "from 'pkg'" usually implies import.

        // Find all occurrences of the package string
        // Regex to match: import ... from "pkg" or require("pkg")
        // But NOT: import type ... from "pkg"

        const strictRegex = new RegExp(`import\\s+(?!type\\s).*\\s+from\\s+['"]${pkg}['"]`, 'g');
        const requireRegex = new RegExp(`require\\s*\\(\\s*['"]${pkg}['"]\\s*\\)`, 'g');

        if (strictRegex.test(content) || requireRegex.test(content)) {
            throw new Error(
                `[CI VIOLATION] Forbidden SDK '${pkg}' referenced in ${filePath}\n   Allowed only in: lib/runtime/`
            );
        }
    }
}

function scan(dir: string) {
    if (!fs.existsSync(dir)) return;

    const entries = fs.readdirSync(dir, { withFileTypes: true });

    for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);

        if (entry.isDirectory()) {
            // Skip node_modules (just in case), .next, .git
            if (entry.name === "node_modules" || entry.name.startsWith(".")) continue;

            // If we are scanning lib, DO NOT scan lib/runtime
            if (fullPath === ALLOWED_DIR) continue;

            // Exclude voice-gateway service (standalone package)
            if (fullPath.includes("services\\voice-gateway") || fullPath.includes("services/voice-gateway")) continue;

            scan(fullPath);
        } else if (entry.isFile()) {
            if (fullPath.endsWith(".ts") || fullPath.endsWith(".tsx") || fullPath.endsWith(".js") || fullPath.endsWith(".mjs")) {
                const content = fs.readFileSync(fullPath, "utf8");
                checkContent(fullPath, content);
            }
        }
    }
}

console.log("🔒 Scanning for forbidden build-time SDK imports...");
console.log(`   Roots: app, services, components, lib (excluding runtime)`);

try {
    scan(APP_DIR);
    scan(SERVICES_DIR);
    scan(COMPONENTS_DIR);
    scan(LIB_DIR);

    console.log("✅ SDK isolation verified");
} catch (e: any) {
    console.error("\n❌ VERIFICATION FAILED");
    console.error(e.message);
    process.exit(1);
}
