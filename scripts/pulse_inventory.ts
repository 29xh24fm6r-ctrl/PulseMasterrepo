#!/usr/bin/env tsx
/**
 * Pulse Feature Inventory Generator
 * Scans the codebase and generates docs/FEATURE_INVENTORY.generated.md
 */

import { readdir, readFile, stat } from "fs/promises";
import { join, relative } from "path";

const ROOT = join(process.cwd());
const APP_DIR = join(ROOT, "app");
const API_DIR = join(ROOT, "app", "api");

interface Feature {
  name: string;
  routes: string[];
  apiRoutes: string[];
  dbTables: string[];
  envVars: string[];
  status: "✅ wired" | "🟡 partial" | "🔴 stub";
}

const MANIFEST: Record<string, {
  dbTables?: string[];
  envVars?: string[];
  status?: Feature["status"];
}> = {
  "contacts": {
    dbTables: ["contacts", "crm_contacts"],
    envVars: [],
    status: "✅ wired",
  },
  "tasks": {
    dbTables: ["tasks"],
    envVars: [],
    status: "✅ wired",
  },
  "deals": {
    dbTables: ["crm_deals", "deals"],
    envVars: [],
    status: "✅ wired",
  },
  "habits": {
    dbTables: ["habits", "habit_logs"],
    envVars: [],
    status: "✅ wired",
  },
  "journal": {
    dbTables: ["journal_entries"],
    envVars: [],
    status: "✅ wired",
  },
  "follow-ups": {
    dbTables: ["follow_ups"],
    envVars: ["GMAIL_CLIENT_ID", "GMAIL_CLIENT_SECRET"],
    status: "🟡 partial",
  },
  "job-queue": {
    dbTables: ["job_queue", "job_runs", "job_queue_events"],
    envVars: ["JOB_QUEUE_CRON_SECRET"],
    status: "✅ wired",
  },
  "autopilot": {
    dbTables: ["plugin_automations", "life_arc_autopilot_runs", "life_arc_autopilot_suggestions"],
    envVars: ["AUTOPILOT_CRON_SECRET"],
    status: "✅ wired",
  },
  "voice": {
    dbTables: ["voice_sessions"],
    envVars: ["OPENAI_API_KEY"],
    status: "🟡 partial",
  },
  "coaches": {
    dbTables: ["coaching_sessions"],
    envVars: [],
    status: "✅ wired",
  },
};

async function findFiles(dir: string, pattern: RegExp): Promise<string[]> {
  const files: string[] = [];
  try {
    const entries = await readdir(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = join(dir, entry.name);
      if (entry.isDirectory() && !entry.name.startsWith(".") && entry.name !== "node_modules") {
        files.push(...(await findFiles(fullPath, pattern)));
      } else if (entry.isFile() && pattern.test(entry.name)) {
        files.push(fullPath);
      }
    }
  } catch (err) {
    // Directory doesn't exist or can't read
  }
  return files;
}

async function extractRoutes(dir: string, pattern: RegExp): Promise<string[]> {
  const files = await findFiles(dir, pattern);
  return files.map((f) => {
    const rel = relative(dir, f);
    // Convert file path to route path
    // app/contacts/page.tsx -> /contacts
    // app/deals/[dealId]/page.tsx -> /deals/[dealId]
    let route = "/" + rel.replace(/\/page\.tsx$/, "").replace(/\\/g, "/");
    if (route.endsWith("/page")) route = route.slice(0, -5);
    if (route === "/page") route = "/";
    return route;
  }).filter((r) => r !== "/" && !r.includes("(")); // Exclude root and route groups
}

async function extractApiRoutes(dir: string): Promise<string[]> {
  const files = await findFiles(dir, /route\.ts$/);
  return files.map((f) => {
    const rel = relative(dir, f);
    // app/api/contacts/route.ts -> /api/contacts
    // app/api/contacts/[id]/route.ts -> /api/contacts/[id]
    let route = "/api/" + rel.replace(/\/route\.ts$/, "").replace(/\\/g, "/");
    return route;
  }).sort();
}

function inferFeatureName(route: string): string {
  // /contacts -> contacts
  // /api/tasks -> tasks
  // /deals/[dealId] -> deals
  const parts = route.split("/").filter(Boolean);
  if (parts[0] === "api") {
    return parts[1] || "unknown";
  }
  return parts[0] || "unknown";
}

async function generateInventory(): Promise<string> {
  const routes = await extractRoutes(APP_DIR, /page\.tsx$/);
  const apiRoutes = await extractApiRoutes(API_DIR);

  // Group by feature
  const features = new Map<string, Feature>();

  // Add routes to features
  for (const route of routes) {
    const featureName = inferFeatureName(route);
    if (!features.has(featureName)) {
      const manifest = MANIFEST[featureName] || {};
      features.set(featureName, {
        name: featureName,
        routes: [],
        apiRoutes: [],
        dbTables: manifest.dbTables || [],
        envVars: manifest.envVars || [],
        status: manifest.status || "🔴 stub",
      });
    }
    features.get(featureName)!.routes.push(route);
  }

  // Add API routes to features
  for (const apiRoute of apiRoutes) {
    const featureName = inferFeatureName(apiRoute);
    if (!features.has(featureName)) {
      const manifest = MANIFEST[featureName] || {};
      features.set(featureName, {
        name: featureName,
        routes: [],
        apiRoutes: [],
        dbTables: manifest.dbTables || [],
        envVars: manifest.envVars || [],
        status: manifest.status || "🔴 stub",
      });
    }
    features.get(featureName)!.apiRoutes.push(apiRoute);
  }

  // Generate markdown
  let md = `# Pulse Feature Inventory

*Auto-generated by \`scripts/pulse_inventory.ts\`*

Last updated: ${new Date().toISOString()}

## Summary

Total features: ${features.size}
Status breakdown:
- ✅ Wired: ${Array.from(features.values()).filter(f => f.status === "✅ wired").length}
- 🟡 Partial: ${Array.from(features.values()).filter(f => f.status === "🟡 partial").length}
- 🔴 Stub: ${Array.from(features.values()).filter(f => f.status === "🔴 stub").length}

---

`;

  const sortedFeatures = Array.from(features.values()).sort((a, b) => a.name.localeCompare(b.name));

  for (const feature of sortedFeatures) {
    md += `## ${feature.name.charAt(0).toUpperCase() + feature.name.slice(1)}

**Status:** ${feature.status}

### UI Routes
${feature.routes.length > 0 ? feature.routes.map(r => `- \`${r}\``).join("\n") : "- *None*"}

### API Routes
${feature.apiRoutes.length > 0 ? feature.apiRoutes.map(r => `- \`${r}\``).join("\n") : "- *None*"}

### Required DB Tables
${feature.dbTables.length > 0 ? feature.dbTables.map(t => `- \`${t}\``).join("\n") : "- *None*"}

### Required Env Vars
${feature.envVars.length > 0 ? feature.envVars.map(v => `- \`${v}\``).join("\n") : "- *None*"}

---

`;
  }

  return md;
}

async function main() {
  try {
    const inventory = await generateInventory();
    const outputPath = join(ROOT, "docs", "FEATURE_INVENTORY.generated.md");
    await import("fs/promises").then(fs => fs.writeFile(outputPath, inventory, "utf-8"));
    console.log(`✅ Generated ${outputPath}`);
    console.log(`📊 Features: ${inventory.match(/^## /gm)?.length || 0}`);
  } catch (err) {
    console.error("❌ Failed to generate inventory:", err);
    process.exit(1);
  }
}

main();

