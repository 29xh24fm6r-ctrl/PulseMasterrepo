/**
 * node scripts/obs-qa.mjs https://your-domain.com
 * Produces a single JSON OBS QA REPORT for paste-back.
 */

const base = process.argv[2];
if (!base) {
    console.error("Usage: node scripts/obs-qa.mjs https://your-domain.com");
    process.exit(1);
}

const runId = `qa_${Date.now()}_${Math.random().toString(16).slice(2)}`;

async function timedFetch(path, expectOk = true) {
    const url = `${base}${path}`;
    const t0 = Date.now();

    const res = await fetch(url, {
        headers: { "x-obs-qa-run-id": runId },
    });

    const ms = Date.now() - t0;
    // Robustly handle body text
    let body = "";
    try { body = await res.text(); } catch (e) { }

    const ok = expectOk ? res.ok : res.status >= 500;

    return {
        ok,
        url,
        status: res.status,
        ms,
        body_preview: body.slice(0, 200),
    };
}

(async () => {
    const checks = [];

    // Health check first
    checks.push(await timedFetch("/api/health", true));

    // QA Modes
    checks.push(await timedFetch("/api/obs/qa?mode=ok", true));
    checks.push(await timedFetch("/api/obs/qa?mode=latency&ms=300", true));
    checks.push(await timedFetch("/api/obs/qa?mode=latency&ms=1200", true));

    // Error check (expecting 500)
    checks.push(await timedFetch("/api/obs/qa?mode=error", false));

    const passed = checks.filter(c => c.ok).length;
    const total = checks.length;

    const slowest = [...checks].sort((a, b) => b.ms - a.ms)[0];
    const fastest = [...checks].sort((a, b) => a.ms - b.ms)[0];

    const report = {
        run_id: runId,
        base,
        pass: passed === total,
        totals: { passed, total },
        fastest_ms: fastest?.ms ?? null,
        slowest_ms: slowest?.ms ?? null,
        checks: checks.map(c => ({ ok: c.ok, status: c.status, ms: c.ms, url: c.url })),
        sentry_filters: {
            tag: `obs_qa_run_id:${runId}`,
            release: "release:NEXT_PUBLIC_PULSE_RELEASE (verify actual value in Sentry UI)",
            env: "environment:production",
        },
    };

    console.log("\n=== OBS QA REPORT ===");
    console.log(JSON.stringify(report, null, 2));
    console.log("=== END REPORT ===\n");

    process.exit(report.pass ? 0 : 1);
})();
