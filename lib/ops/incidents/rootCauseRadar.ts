// src/lib/ops/incidents/rootCauseRadar.ts
import "server-only";
import type { DiffLens } from "@/lib/ops/incidents/postmortemBuilder";

type RadarHit = {
  score: number;
  file: string;
  reasons: string[];
  suggested_checks: string[];
};

type RadarResult = {
  ok: boolean;
  totalFiles: number;
  topHits: RadarHit[];
  globalFlags: string[];
};

function addReason(hit: RadarHit, score: number, reason: string, checks: string[] = []) {
  hit.score += score;
  hit.reasons.push(reason);
  hit.suggested_checks.push(...checks);
}

function uniq<T>(arr: T[]) {
  return Array.from(new Set(arr));
}

function looksLikeRouteFile(path: string) {
  return /\/app\/.*\/route\.ts$/i.test(path) || /\/pages\/api\//i.test(path);
}

function looksLikeAuthTenant(path: string) {
  return /(auth|clerk|tenant|getCurrentBankId|bank_id|rls|policy|requireUser)/i.test(path);
}

function looksLikeEnvConfig(path: string) {
  return /(env|config|runtime|process\.env|middleware)/i.test(path);
}

function looksLikeServerOnlyRisk(path: string) {
  return /(server-only|\/server\/|lib\/agi\/|orchestrator|kernel)/i.test(path);
}

function looksLikeMigrationOrDb(path: string) {
  return /(migrations|supabase|sql|schema|rls|policies|tables)/i.test(path);
}

function looksLikeDealsCritical(path: string) {
  return /(deals|dealId|conditions|forms|ocr|jobs|upload)/i.test(path);
}

function looksLikeApiOrFetch(path: string) {
  return /(fetch|route\.ts|api|http|client|supabase)/i.test(path);
}

function checksForFile(path: string) {
  const checks: string[] = [];

  if (looksLikeRouteFile(path)) {
    checks.push("Hit the endpoint locally and in prod; confirm status codes + JSON shape.");
    checks.push("Verify route exports (GET/POST) and runtime (nodejs/edge) settings.");
  }
  if (looksLikeAuthTenant(path)) {
    checks.push("Validate Clerk session -> user id resolver and tenant selection path.");
    checks.push("Check RLS / profile lookup queries (bank_id selection) for runtime fetch failures.");
  }
  if (looksLikeEnvConfig(path)) {
    checks.push("Confirm required env vars are present in prod and in preview deploys.");
    checks.push("Check middleware / runtime mismatches (nodejs vs edge) for fetch failures.");
  }
  if (looksLikeMigrationOrDb(path)) {
    checks.push("Verify migrations applied in Supabase; check RLS policies for denied reads.");
    checks.push("Confirm expected columns/constraints exist (bank_id FK, etc.).");
  }
  if (looksLikeServerOnlyRisk(path)) {
    checks.push("Check for server-only imports leaking into client components (Next.js app router boundaries).");
    checks.push("Confirm page/component is Server Component if using server-only modules.");
  }

  return uniq(checks);
}

/**
 * Deterministic radar based on file paths + diff metadata only.
 * No LLM. No code parsing. Meant to give a ranked shortlist quickly.
 */
export function buildRootCauseRadar(
  diff: DiffLens | null,
  correlator?: { matchedFiles: { file: string; count: number }[] } | null
): RadarResult {
  if (!diff?.ok || !diff.files) {
    return { ok: false, totalFiles: 0, topHits: [], globalFlags: ["diff_lens_unavailable"] };
  }

  const hits: RadarHit[] = diff.files.map((f) => ({
    score: 0,
    file: f.filename,
    reasons: [],
    suggested_checks: [],
  }));

  const globalFlags: string[] = [];

  // Global signals
  const touchedMigrations = diff.files.some((f) => looksLikeMigrationOrDb(f.filename));
  const touchedRoutes = diff.files.some((f) => looksLikeRouteFile(f.filename));
  const touchedAuthTenant = diff.files.some((f) => looksLikeAuthTenant(f.filename));
  const touchedEnv = diff.files.some((f) => looksLikeEnvConfig(f.filename));
  const touchedServerOnly = diff.files.some((f) => looksLikeServerOnlyRisk(f.filename));

  if (touchedMigrations) globalFlags.push("db_or_rls_touched");
  if (touchedRoutes) globalFlags.push("api_routes_touched");
  if (touchedAuthTenant) globalFlags.push("auth_or_tenant_touched");
  if (touchedEnv) globalFlags.push("env_or_runtime_touched");
  if (touchedServerOnly) globalFlags.push("server_only_risk_touched");

  for (const h of hits) {
    const p = h.file;
    const meta = diff.files.find((x) => x.filename === p);

    // Base weighting by status (removed/renamed files are more suspicious)
    if (meta?.status === "removed") {
      addReason(h, 40, "File removed", ["Confirm nothing imports this file anymore; check runtime stack traces."]);
    } else if (meta?.status === "renamed") {
      addReason(h, 25, "File renamed", ["Search imports and update paths; verify build passes."]);
    } else if (meta?.status === "modified") {
      addReason(h, 5, "File modified");
    } else if (meta?.status === "added") {
      addReason(h, 3, "File added");
    }

    // Danger zones
    if (looksLikeRouteFile(p)) {
      addReason(h, 30, "API route changed", checksForFile(p));
    }
    if (looksLikeAuthTenant(p)) {
      addReason(h, 35, "Auth/tenant selection changed", checksForFile(p));
    }
    if (looksLikeEnvConfig(p)) {
      addReason(h, 25, "Env/runtime/middleware changed", checksForFile(p));
    }
    if (looksLikeMigrationOrDb(p)) {
      addReason(h, 35, "DB/migrations/RLS touched", checksForFile(p));
    }
    if (looksLikeServerOnlyRisk(p)) {
      addReason(h, 30, "Server-only boundary risk", checksForFile(p));
    }
    if (looksLikeDealsCritical(p)) {
      addReason(h, 18, "Deals-critical surface touched", checksForFile(p));
    }
    if (looksLikeApiOrFetch(p)) {
      addReason(h, 12, "Network/fetch boundary likely involved", checksForFile(p));
    }

    // Size heuristic (big diffs more risky)
    const changes = typeof meta?.changes === "number" ? meta.changes : 0;
    if (changes >= 200) addReason(h, 18, "Large diff (>=200 line changes)");
    else if (changes >= 80) addReason(h, 10, "Medium diff (>=80 line changes)");

    h.suggested_checks = uniq(h.suggested_checks);
    h.reasons = uniq(h.reasons);
  }

  // Sort by score desc, keep top 5
  hits.sort((a, b) => b.score - a.score);

  const topHits = hits.filter((h) => h.score > 0).slice(0, 5);

  return {
    ok: true,
    totalFiles: diff.files.length,
    topHits,
    globalFlags: uniq(globalFlags),
  };
}

export function radarToMarkdown(radar: RadarResult) {
  if (!radar.ok) {
    return `## Root Cause Radar (Deterministic)\n- (Radar unavailable)\n`;
  }

  const flags = radar.globalFlags.length ? radar.globalFlags.map((f) => `\`${f}\``).join(", ") : "—";

  const hits =
    radar.topHits.length === 0
      ? `- (No high-risk files detected by heuristics)`
      : radar.topHits
          .map((h) => {
            const reasons = h.reasons.map((r) => `  - ${r}`).join("\n");
            const checks = h.suggested_checks.length
              ? `\n  **Next checks:**\n${h.suggested_checks.map((c) => `  - ${c}`).join("\n")}`
              : "";
            return `- **${h.file}** — score **${h.score}**\n${reasons}${checks}`;
          })
          .join("\n\n");

  return `## Root Cause Radar (Deterministic)

**Signals:** ${flags}  

**Files analyzed:** ${radar.totalFiles}



### Top suspects

${hits}



`;
}

