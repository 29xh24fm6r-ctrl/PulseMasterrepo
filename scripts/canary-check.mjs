// scripts/canary-check.mjs
// Fails CI if any "core" feature canary is red (severity=fail or ok=false)

const CORE_FEATURES = [
  "contacts",
  "tasks",
  "deals",
  "journal",
  "habits",
  "life-intelligence", // intel
  "scheduler-admin", // jobs
];

const BASE_URL = process.env.CANARY_BASE_URL || "http://localhost:3000";
const CI_TOKEN = process.env.CANARY_CI_TOKEN || "";

function fatal(msg) {
  console.error(`\n❌ CANARY CHECK FAILED: ${msg}\n`);
  process.exit(1);
}

async function main() {
  // 1) Run all canaries
  const headers = {
    "Content-Type": "application/json",
    ...(CI_TOKEN ? { "x-canary-ci-token": CI_TOKEN } : {}),
  };

  const runRes = await fetch(`${BASE_URL}/api/ops/features/canary`, {
    method: "POST",
    headers,
    body: JSON.stringify({}),
  });

  if (!runRes.ok) {
    const t = await runRes.text().catch(() => "");
    fatal(`POST /api/ops/features/canary returned ${runRes.status}. ${t}`);
  }

  const runJson = await runRes.json().catch(() => null);
  if (!runJson?.ok) {
    fatal(`POST canary run did not return ok=true. Payload: ${JSON.stringify(runJson)}`);
  }

  // Verify CI auth was used (optional check)
  if (runJson.authMode !== "ci") {
    console.warn(`⚠️  Warning: Canary check did not use CI auth mode (got: ${runJson.authMode || "unknown"})`);
  }

  const results = runJson.results || {};
  const missing = CORE_FEATURES.filter((f) => !results[f]);

  if (missing.length) {
    fatal(`Missing core canary results for: ${missing.join(", ")}`);
  }

  // 2) Evaluate core features
  const failures = [];
  for (const fid of CORE_FEATURES) {
    const r = results[fid];
    const ok = !!r?.ok;

    if (!ok) {
      const failedChecks = (r?.checks || []).filter((c) => !c.ok).slice(0, 5);
      failures.push({
        featureId: fid,
        notes: r?.message || [],
        failedChecks,
      });
    }
  }

  if (failures.length) {
    console.error("\n=== Canary Failures (Core) ===\n");
    for (const f of failures) {
      console.error(`• ${f.featureId}`);
      for (const c of f.failedChecks) {
        console.error(`   - ${c.label}${c.error ? `: ${c.error}` : c.details ? `: ${c.details}` : ""}`);
      }
      if (f.notes) {
        console.error(`   message: ${f.notes}`);
      }
      console.error("");
    }
    fatal(`${failures.length} core feature(s) failing canaries.`);
  }

  console.log("\n✅ Canary Check Passed: all core features healthy.\n");
}

main().catch((e) => fatal(e?.message || String(e)));

