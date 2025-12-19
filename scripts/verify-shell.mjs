import http from "node:http";

const ROUTES = ["/home", "/people", "/crm", "/productivity"];
const HOST = "http://localhost:3000";

function fetchRoute(path) {
  return new Promise((resolve, reject) => {
    http.get(`${HOST}${path}`, (res) => {
      let data = "";
      res.on("data", (c) => (data += c));
      res.on("end", () => resolve({ path, status: res.statusCode, html: data }));
    }).on("error", reject);
  });
}

function includesGlobalNav(html) {
  // Very stable fingerprint: the word "NAV_GROUPS" won't exist in HTML,
  // so instead check for the Pulse pills labels that are hardcoded.
  return (
    html.includes("Work") &&
    html.includes("Wellness") &&
    html.includes("Growth") &&
    html.includes("Strategy") &&
    html.includes("Coaches")
  );
}

(async function main() {
  console.log("Shell Ownership Verification:");
  console.log(`Checking: ${ROUTES.join(", ")}`);

  const results = await Promise.all(ROUTES.map(fetchRoute));

  let failed = false;

  for (const r of results) {
    const hit = includesGlobalNav(r.html);
    console.log(`- ${r.path} -> ${r.status} | GlobalNav present: ${hit ? "YES ❌" : "NO ✅"}`);
    if (hit) failed = true;
  }

  if (failed) {
    console.error("\nFAIL: GlobalNavEnhanced is still rendering on at least one Pulse shell route.");
    process.exit(1);
  }

  console.log("\nPASS: GlobalNavEnhanced is not rendering on Pulse shell routes.");
})();

