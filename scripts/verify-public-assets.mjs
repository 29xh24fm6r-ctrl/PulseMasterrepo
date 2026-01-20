// scripts/verify-public-assets.mjs
// Usage: node scripts/verify-public-assets.mjs https://your-deployment-url

const base = process.argv[2];
if (!base) {
    console.error("Missing base URL. Example: node scripts/verify-public-assets.mjs https://example.com");
    process.exit(1);
}

const targets = [
    "/manifest.json",
    "/robots.txt",
    "/favicon.ico",
];

async function check(path) {
    const url = new URL(path, base).toString();
    const res = await fetch(url, { redirect: "manual" });
    const ok = res.status >= 200 && res.status < 300;
    if (!ok) {
        const text = await res.text().catch(() => "");
        console.error(`FAIL ${res.status} ${url}`);
        console.error(text.slice(0, 300));
        process.exit(1);
    }
    console.log(`OK ${res.status} ${url}`);
}

(async () => {
    for (const t of targets) await check(t);
    console.log("Public asset verification PASSED.");
})();
