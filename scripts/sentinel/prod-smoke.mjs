// scripts/sentinel/prod-smoke.mjs
import { setTimeout as sleep } from "node:timers/promises";

function die(msg) {
  console.error(`\n❌ ${msg}\n`);
  process.exit(1);
}

function normBase(u) {
  if (!u) return null;
  let s = String(u).trim();
  if (!s.startsWith("http")) s = "https://" + s;
  return s.replace(/\/+$/, "");
}

async function httpJson(url) {
  const res = await fetch(url, { headers: { Accept: "application/json" } });
  const text = await res.text();
  let json = null;
  try {
    json = JSON.parse(text);
  } catch {}
  return { ok: res.ok, status: res.status, text, json };
}

async function waitReady(base, tries = 10) {
  const url = `${base}/api/health/db`;
  for (let i = 1; i <= tries; i++) {
    const r = await httpJson(url);
    if (r.ok && r.json?.ok === true) return true;
    console.log(`Waiting for prod health... ${i}/${tries} (status ${r.status})`);
    await sleep(2000);
  }
  return false;
}

async function main() {
  const base = normBase(process.argv[2] || process.env.PROD_URL);
  if (!base) die("Usage: node scripts/sentinel/prod-smoke.mjs <prod_url>");

  console.log(`\n=== PROD SMOKE: ${base} ===\n`);

  const ready = await waitReady(base);
  if (!ready) die("Prod never became healthy at /api/health/db");

  // Health DB (must be stable)
  const h = await httpJson(`${base}/api/health/db`);
  if (!h.ok || h.json?.ok !== true) {
    console.error("health/db:", h.status, h.text);
    die("Health DB failed");
  }
  console.log("✅ /api/health/db ok");

  // Optional: add another cheap endpoint if you have one:
  // const r = await httpJson(`${base}/api/health/app`);
  // if (!r.ok || r.json?.ok !== true) die("Health app failed");

  console.log("\n✅ PROD SMOKE PASSED\n");
}

main().catch((e) => die(e?.message || String(e)));

