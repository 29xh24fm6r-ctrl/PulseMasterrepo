// scripts/verify-preview-runtime.ts
import http from "http";

const ORIGIN = process.env.PREVIEW_VERIFY_ORIGIN || "http://localhost:3000";

const paths = [
    "/manifest.json",
    "/api/runtime/state",
    "/api/runtime/observer",
    "/api/runtime/plan",
    "/api/runtime/home",
];

function get(path: string): Promise<number> {
    return new Promise((resolve, reject) => {
        http
            .get(`${ORIGIN}${path}`, (res) => {
                resolve(res.statusCode || 0);
            })
            .on("error", reject);
    });
}

async function main() {
    console.log(`🔍 Verifying Preview Runtime against ${ORIGIN}...`);
    const failures: { path: string; status: number }[] = [];

    for (const p of paths) {
        console.log(`Checking ${p}...`);
        const status = await get(p);
        if (status !== 200) {
            console.log(`❌ Failed: ${status}`);
            failures.push({ path: p, status });
        } else {
            console.log(`✅ OK`);
        }
    }

    if (failures.length) {
        console.error("Preview runtime contract violated:");
        for (const f of failures) console.error(`- ${f.path} => ${f.status}`);
        process.exit(1);
    }

    console.log("✅ Preview runtime contract OK");
}

main().catch((e) => {
    console.error(e);
    process.exit(1);
});
