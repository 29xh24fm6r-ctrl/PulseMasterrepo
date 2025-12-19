/* eslint-disable no-console */
import fs from "node:fs";
import path from "node:path";
import url from "node:url";

const __dirname = path.dirname(url.fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");

// Change this list to stub only specific features first:
const TARGET_FEATURE_IDS = new Set(["features", "life-intelligence", "plugins"]);

function ensureDir(p) {
  fs.mkdirSync(p, { recursive: true });
}

function writeIfMissing(fp, content) {
  if (fs.existsSync(fp)) return false;
  ensureDir(path.dirname(fp));
  fs.writeFileSync(fp, content, "utf8");
  return true;
}

function routeFileTemplate(methods) {
  const handlers = methods.map((m) => {
    return `export async function ${m}(req: Request) {
  return new Response(JSON.stringify({ ok: false, error: "Not implemented" }), {
    status: 501,
    headers: { "content-type": "application/json" },
  });
}`;
  }).join("\n\n");

  return `export const runtime = "nodejs";\n\n${handlers}\n`;
}

async function main() {
  const res = await fetch("http://localhost:3000/api/ops/dead-sweeper?days=30", { cache: "no-store" });
  const text = await res.text();
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error("Dead-sweeper endpoint did not return JSON");
  }
  if (!data?.ok) throw new Error(`Dead-sweeper failed: ${data?.error || "unknown"}`);

  const features = data.features || [];
  const targets = features.filter((f) => TARGET_FEATURE_IDS.has(f.feature_id));

  let created = 0;

  for (const f of targets) {
    const missing = f.missing_api_details || [];
    for (const item of missing) {
      // item.api is expected like "GET /api/foo/bar" or "/api/foo/bar"
      const raw = String(item.api || "");

      // Normalize: remove method prefix if present
      let apiPath = raw.trim();
      const methodMatch = apiPath.match(/^(GET|POST|PUT|PATCH|DELETE)\s+(.+)$/);
      if (methodMatch) {
        apiPath = methodMatch[2];
      }

      if (!apiPath) continue;

      // normalize: ensure leading / and ensure it starts with /api
      if (!apiPath.startsWith("/")) apiPath = "/" + apiPath;
      if (!apiPath.startsWith("/api")) continue;

      // translate "/api/x/y" to app/api/x/y/route.ts
      const rel = apiPath.replace(/^\/api\//, "app/api/");
      const routeDir = path.join(root, rel);
      const routeFp = path.join(routeDir, "route.ts");

      // if method unknown, stub common methods
      const methods = methodMatch ? [methodMatch[1]] : ["GET", "POST"];

      const wrote = writeIfMissing(routeFp, routeFileTemplate(methods));
      if (wrote) {
        created++;
        console.log(`+ stubbed ${routeFp} (${methods.join(",")})`);
      } else {
        console.log(`= exists ${routeFp}`);
      }
    }
  }

  console.log(`\nDone. Created ${created} stub route(s).`);
  console.log(`Next: re-run /ops/dead-sweeper and confirm BROKEN drops.`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

