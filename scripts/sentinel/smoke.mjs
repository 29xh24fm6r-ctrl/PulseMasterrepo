// scripts/sentinel/smoke.mjs
import { setTimeout as sleep } from "node:timers/promises";

function die(msg) {
  console.error(`\n❌ ${msg}\n`);
  process.exit(1);
}

async function httpJson(url, opts = {}) {
  const res = await fetch(url, {
    method: opts.method || "GET",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      ...(opts.headers || {}),
    },
    body: opts.body ? JSON.stringify(opts.body) : undefined,
  });

  const text = await res.text();
  let json = null;
  try {
    json = JSON.parse(text);
  } catch {
    /* ignore */
  }

  return { ok: res.ok, status: res.status, text, json };
}

function normBase(u) {
  if (!u) return null;
  let s = String(u).trim();
  if (!s.startsWith("http")) s = "https://" + s;
  return s.replace(/\/+$/, "");
}

async function waitForReady(base, tries = 20) {
  const url = `${base}/api/health/db`;
  for (let i = 1; i <= tries; i++) {
    const r = await httpJson(url);
    if (r.ok && r.json && r.json.ok === true) return true;
    console.log(`Waiting for preview... attempt ${i}/${tries} (status ${r.status})`);
    await sleep(3000);
  }
  return false;
}

async function main() {
  const base = normBase(process.argv[2] || process.env.PREVIEW_URL);
  if (!base) die("Usage: node scripts/sentinel/smoke.mjs <preview_url>");

  console.log(`\n=== Canary Smoke: ${base} ===\n`);

  // 1) Wait until preview is live
  const ready = await waitForReady(base);
  if (!ready) die("Preview never became healthy at /api/health/db");

  // 2) Health DB
  {
    const r = await httpJson(`${base}/api/health/db`);
    if (!r.ok || r.json?.ok !== true) {
      console.error("health/db response:", r.status, r.text);
      die("Health DB check failed");
    }
    console.log("✅ /api/health/db ok");
  }

  // 3) Simulation scenarios endpoint (may require auth - we'll handle gracefully)
  {
    const r = await httpJson(`${base}/api/simulation/paths/scenarios`);
    if (!r.ok) {
      // If it's 401/403, that's expected for auth-protected routes
      // We'll log but not fail the smoke test
      if (r.status === 401 || r.status === 403) {
        console.log("⚠️ /api/simulation/paths/scenarios requires auth (expected)");
      } else {
        console.error("scenarios response:", r.status, r.text);
        die("Simulation scenarios endpoint failed");
      }
    } else {
      console.log("✅ /api/simulation/paths/scenarios ok");
    }
  }

  // 4) Optional: run a lightweight simulation (skip if auth required)
  // We'll skip this for now since it likely requires auth
  // If you want to enable this, add a sentinel auth token approach
  console.log("ℹ️ Skipping simulation run (requires auth)");

  console.log("\n✅ Canary smoke passed.\n");
}

main().catch((e) => die(e?.message || String(e)));

