type CheckResult = {
    name: string;
    url: string;
    expectedStatus: number;
    header?: { key: string; allowedIncludes?: string[]; required?: boolean };
};

async function checkRoute(base: string, test: CheckResult) {
    const res = await fetch(base + test.url, { redirect: "manual" });

    const statusOk = res.status === test.expectedStatus;

    let headerOk = true;
    let headerVal: string | null = null;

    if (test.header) {
        headerVal = res.headers.get(test.header.key);
        if (test.header.required && !headerVal) headerOk = false;

        if (test.header.allowedIncludes && headerVal) {
            headerOk = test.header.allowedIncludes.some((v) => headerVal!.includes(v));
        }
    }

    return {
        ...test,
        status: res.status,
        statusOk,
        headerVal,
        headerOk,
    };
}

async function main() {
    const base = process.env.PULSE_VERIFY_BASE_URL || "http://localhost:3000";

    const tests: CheckResult[] = [
        { name: "manifest", url: "/manifest.json", expectedStatus: 200 },
        { name: "favicon", url: "/favicon.ico", expectedStatus: 200 },
        {
            name: "bridge",
            url: "/bridge",
            expectedStatus: 200,
            header: {
                key: "x-pulse-mw",
                required: true,
                allowedIncludes: ["allow_dev_bypass", "allow_auth"],
            },
        },
    ];

    const results = [];
    for (const t of tests) results.push(await checkRoute(base, t));

    const failed = results.filter((r) => !r.statusOk || !r.headerOk);

    for (const r of results) {
        const hdr = r.header ? ` | ${r.header.key}=${r.headerVal ?? "(missing)"}` : "";
        console.log(
            `${r.statusOk && r.headerOk ? "✅" : "❌"} ${r.name} ${r.url} -> ${r.status} (expected ${r.expectedStatus})${hdr}`
        );
    }

    if (failed.length) {
        console.error("\n❌ CI Route Contract FAILED.");
        console.error(
            "Fix guidance:\n" +
            "- If manifest/favicon fail: ensure public asset bypass and no shadow routes.\n" +
            "- If bridge fails: ensure CI hard bypass returns 200 and sets X-Pulse-MW.\n" +
            "- If headers missing: middleware not running or matcher excludes route.\n"
        );
        process.exit(1);
    }

    console.log("\n✅ CI Route Contract PASSED.");
}

main().catch((e) => {
    console.error("❌ verify-ci-route-contract crashed:", e);
    process.exit(1);
});
