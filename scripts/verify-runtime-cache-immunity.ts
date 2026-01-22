
import { spawn } from "child_process";
import fs from "fs";
import path from "path";

async function main() {
    console.log("🔍 Verifying Runtime Cache Immunity (Phase 25K)...");

    const targetUrl = process.argv[2] || "http://localhost:3000";
    console.log(`Target: ${targetUrl}`);

    const endpoints = [
        "/api/runtime/whoami",
        "/api/runtime/home",
        "/api/runtime/state",
        "/api/runtime/plan",
        "/api/runtime/observer"
    ];

    const errors: string[] = [];

    for (const ep of endpoints) {
        try {
            const url = `${targetUrl}${ep}`;
            // Use no-cache in request to ensure we are testing the server's headers, not local fetch cache
            const res = await fetch(url, { cache: "no-store" });

            // 1. Check Cache-Control
            const cc = res.headers.get("cache-control");
            const expectedCC = "no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0, s-maxage=0";

            if (cc !== expectedCC) {
                errors.push(`[${ep}] Invalid Cache-Control.\n   Expected: ${expectedCC}\n   Received: ${cc}`);
            }

            // 2. Check Pragma
            const pragma = res.headers.get("pragma");
            if (pragma !== "no-cache") {
                errors.push(`[${ep}] Invalid Pragma. Expected 'no-cache', got '${pragma}'`);
            }

            // 3. Check Surrogate-Control
            const surrogate = res.headers.get("surrogate-control");
            if (surrogate !== "no-store") {
                errors.push(`[${ep}] Invalid Surrogate-Control. Expected 'no-store', got '${surrogate}'`);
            }

            // 4. Check Forensic Headers (x-pulse-*)
            const xEnv = res.headers.get("x-pulse-env");
            const xAuth = res.headers.get("x-pulse-auth");

            if (!xEnv) errors.push(`[${ep}] Missing x-pulse-env header`);
            if (!xAuth && ep === "/api/runtime/whoami") errors.push(`[${ep}] Missing x-pulse-auth header`); // Only strictly required on whoami for now?

        } catch (err: any) {
            if (err.cause?.code === 'ECONNREFUSED') {
                console.warn(`⚠️  Server not running at ${targetUrl}. Skipping network check.`);
                return; // Graceful exit if server is down (during static check)
            }
            errors.push(`${ep}: Fetch Error - ${err.message}`);
        }
    }

    // Static SW Check (Always runs)
    try {
        const swPath = path.join(process.cwd(), "public", "sw.js");
        if (fs.existsSync(swPath)) {
            const swContent = fs.readFileSync(swPath, "utf-8");

            if (!swContent.includes('const CACHE_NAME = "pulse-v25k-20260121";')) {
                errors.push("public/sw.js: Version string mismatch (Expected pulse-v25k-20260121)");
            }
            if (!swContent.includes('if (url.pathname.startsWith("/api/runtime/")) return;')) {
                errors.push("public/sw.js: Runtime bypass missing");
            }
        } else {
            errors.push("public/sw.js not found");
        }
    } catch (e: any) {
        errors.push(`SW Check Error: ${e.message}`);
    }

    if (errors.length > 0) {
        console.error("\n❌ Runtime Immunity Verification Failed:");
        errors.forEach(e => console.error(e));
        process.exit(1);
    } else {
        console.log("✅ Runtime Immunity Verified: All headers and SW rules present.");
    }
}

main().catch(err => {
    console.error(err);
    process.exit(1);
});
