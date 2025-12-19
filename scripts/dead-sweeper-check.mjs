/* eslint-disable no-console */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const root = join(__dirname, "..");

// Try to load .env.local for NEXT_PUBLIC_APP_URL
let appUrl = process.env.NEXT_PUBLIC_APP_URL;
if (!appUrl) {
  try {
    const envFile = readFileSync(join(root, ".env.local"), "utf8");
    const match = envFile.match(/NEXT_PUBLIC_APP_URL=(.+)/);
    if (match) appUrl = match[1].trim();
  } catch {
    // .env.local doesn't exist, that's fine
  }
}

if (!appUrl) {
  console.log("DEAD_SWEEPER: NEXT_PUBLIC_APP_URL not set; skipping.");
  process.exit(0);
}

const token = process.env.DEAD_SWEEPER_TOKEN; // optional if you add auth; otherwise remove

const res = await fetch(`${appUrl}/api/ops/dead-sweeper?days=30`, {
  headers: token ? { Authorization: `Bearer ${token}` } : {},
});

const data = await res.json();

if (!data?.ok) {
  console.error("Dead Sweeper report failed:", data?.error || "unknown");
  process.exit(1);
}

const brokenUsed = (data.features || []).filter(
  (f) => f.classification === "BROKEN" && (f.page_views_30d > 0 || f.api_calls_30d > 0)
);

if (brokenUsed.length) {
  console.error("❌ Broken + used features detected:");
  for (const f of brokenUsed.slice(0, 25)) {
    console.error(` - ${f.feature_id} (${f.name}) pv=${f.page_views_30d} api=${f.api_calls_30d}`);
  }
  process.exit(1);
}

console.log("✅ Dead Sweeper check passed (no broken used features)");

