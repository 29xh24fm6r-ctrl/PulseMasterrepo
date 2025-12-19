import "server-only";
import { FEATURE_REGISTRY } from "@/lib/features/registry";
import type { FeatureDef } from "@/lib/features/types";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { API_OWNERSHIP_RULES } from "@/lib/features/api-ownership.manual";

type UsageRow = {
  feature_id: string | null;
  page_views_30d: number | null;
  api_calls_30d: number | null;
  gate_blocks_30d: number | null;
  last_seen_at: string | null;
};

export type SweeperConfig = {
  lookbackDays: number; // UI copy only; view is 30d unless you parameterize later
  dormantIfNoEvents: boolean;
};

export type FeatureFinding = {
  feature_id: string;
  name: string;
  group: string;
  status: string;

  gate?: any;

  page_views_30d: number;
  api_calls_30d: number;
  gate_blocks_30d: number;
  last_seen_at: string | null;

  observed_api_count: number;
  defined_api_count: number;

  missing_api_calls: number;
  unowned_api_calls: number;

  missing_api_details?: { caller_file: string; api: string }[];
  unowned_call_details?: { caller_file: string; api: string }[];

  classification: "USED" | "DORMANT" | "BROKEN" | "HIDDEN" | "INTERNAL";
  severity: "S0" | "S1" | "S2" | "S3";
  recommended_action: "KEEP" | "FIX" | "HIDE" | "REMOVE" | "TRIAGE";
  notes: string[];
};

export type ApiFinding = {
  api: string;
  classification: "USED" | "ORPHAN" | "UNKNOWN";
  calls_30d: number;
  notes: string[];
};

function n(x: any): number {
  const v = Number(x);
  return Number.isFinite(v) ? v : 0;
}

function resolveOwnerFeatureIdForApiPath(path: string): string | null {
  for (const r of API_OWNERSHIP_RULES) {
    if (r.exact && path === r.exact) return r.feature_id;
    if (r.prefix && path.startsWith(r.prefix)) return r.feature_id;
  }
  return null;
}

function classifyFeature(f: FeatureDef, usage?: UsageRow | null): Omit<FeatureFinding, "feature_id" | "name" | "group" | "status" | "gate"> & {
  classification: FeatureFinding["classification"];
  severity: FeatureFinding["severity"];
  recommended_action: FeatureFinding["recommended_action"];
  notes: string[];
} {
  const pageViews = n(usage?.page_views_30d);
  const apiCalls = n(usage?.api_calls_30d);
  const gateBlocks = n(usage?.gate_blocks_30d);
  const lastSeen = usage?.last_seen_at ?? null;

  const missing = n(f.diagnostics?.missing_apis?.length);
  const unowned = n(f.diagnostics?.unowned_calls?.length);

  const missingDetails = (f.diagnostics?.missing_apis || []).slice(0, 200);
  const unownedDetails = (f.diagnostics?.unowned_calls || []).slice(0, 200);

  const observedCount = n(f.observed_apis?.length);
  const definedCount = n(f.apis?.length);

  const isHidden = f.status === "hidden";
  const isBeta = f.status === "beta";

  const notes: string[] = [];
  if (missing) notes.push(`Missing API references detected (${missing}).`);
  // Only show unowned note if feature also has missing refs (BROKEN) - prevents Feature Hub noise
  if (unowned && missing) notes.push(`Unowned API calls detected (${unowned}).`);
  if (!observedCount && definedCount) notes.push(`Defines APIs but no observed API calls (possible dead wiring).`);
  if (gateBlocks > 0) notes.push(`Gate blocks in last 30d: ${gateBlocks}.`);

  // Classification logic
  if (isHidden) {
    return {
      page_views_30d: pageViews,
      api_calls_30d: apiCalls,
      gate_blocks_30d: gateBlocks,
      last_seen_at: lastSeen,
      observed_api_count: observedCount,
      defined_api_count: definedCount,
      missing_api_calls: missing,
      unowned_api_calls: unowned,
      missing_api_details: missingDetails.length > 0 ? missingDetails : undefined,
      unowned_call_details: unownedDetails.length > 0 ? unownedDetails : undefined,
      classification: "HIDDEN",
      severity: "S3",
      recommended_action: "TRIAGE",
      notes,
    };
  }

  if (missing > 0) {
    return {
      page_views_30d: pageViews,
      api_calls_30d: apiCalls,
      gate_blocks_30d: gateBlocks,
      last_seen_at: lastSeen,
      observed_api_count: observedCount,
      defined_api_count: definedCount,
      missing_api_calls: missing,
      unowned_api_calls: unowned,
      missing_api_details: missingDetails,
      unowned_call_details: unownedDetails,
      classification: "BROKEN",
      severity: pageViews > 0 ? "S0" : "S1",
      recommended_action: "FIX",
      notes,
    };
  }

  const used = pageViews > 0 || apiCalls > 0;

  if (used) {
    return {
      page_views_30d: pageViews,
      api_calls_30d: apiCalls,
      gate_blocks_30d: gateBlocks,
      last_seen_at: lastSeen,
      observed_api_count: observedCount,
      defined_api_count: definedCount,
      missing_api_calls: missing,
      unowned_api_calls: unowned,
      missing_api_details: missingDetails.length > 0 ? missingDetails : undefined,
      unowned_call_details: unownedDetails.length > 0 ? unownedDetails : undefined,
      classification: "USED",
      severity: "S3",
      recommended_action: "KEEP",
      notes,
    };
  }

  // Not used in 30d
  return {
    page_views_30d: pageViews,
    api_calls_30d: apiCalls,
    gate_blocks_30d: gateBlocks,
    last_seen_at: lastSeen,
    observed_api_count: observedCount,
    defined_api_count: definedCount,
    missing_api_calls: missing,
    unowned_api_calls: unowned,
    missing_api_details: missingDetails.length > 0 ? missingDetails : undefined,
    unowned_call_details: unownedDetails.length > 0 ? unownedDetails : undefined,
    classification: "DORMANT",
    severity: isBeta ? "S2" : "S1",
    recommended_action: isBeta ? "TRIAGE" : "HIDE",
    notes,
  };
}

export async function runDeadSweeper(config: SweeperConfig) {
  // Check required env vars
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error("Missing required env vars: NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  }

  // 1) Usage map (30d view)
  // Note: This assumes a view exists. If not, we'll query pulse_events directly as fallback.
  let usageRows: any[] = [];
  
  try {
    const { data, error } = await supabaseAdmin
      .from("pulse_feature_usage_30d")
      .select("feature_id, page_views_30d, api_calls_30d, gate_blocks_30d, last_seen_at");
    
    if (error) throw error;
    usageRows = data || [];
  } catch {
    // Fallback: query pulse_events directly if view doesn't exist
    const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const { data: events, error } = await supabaseAdmin
      .from("pulse_events")
      .select("feature_id, event_name, created_at")
      .gte("created_at", since);
    
    if (error) {
      // If pulse_events table doesn't exist, return empty usage
      console.warn("[DEAD_SWEEPER] pulse_events table not accessible:", error.message);
      usageRows = [];
    } else {
      // Aggregate manually
      const usageMap = new Map<string, { page_views: number; api_calls: number; gate_blocks: number; last_seen: string | null }>();
      
      for (const e of events || []) {
        const fid = e.feature_id || "unknown";
        if (!usageMap.has(fid)) {
          usageMap.set(fid, { page_views: 0, api_calls: 0, gate_blocks: 0, last_seen: null });
        }
        const u = usageMap.get(fid)!;
        
        if (e.event_name === "page_view") u.page_views++;
        else if (e.event_name === "api_call") u.api_calls++;
        else if (e.event_name === "gate_block") u.gate_blocks++;
        
        if (!u.last_seen || (e.created_at && e.created_at > u.last_seen)) {
          u.last_seen = e.created_at;
        }
      }
      
      usageRows = Array.from(usageMap.entries()).map(([feature_id, u]) => ({
        feature_id,
        page_views_30d: u.page_views,
        api_calls_30d: u.api_calls,
        gate_blocks_30d: u.gate_blocks,
        last_seen_at: u.last_seen,
      }));
    }
  }

  const usageByFeature = new Map<string, UsageRow>();
  for (const r of usageRows) {
    if (r?.feature_id) usageByFeature.set(r.feature_id, r as UsageRow);
  }

  // 2) Feature findings
  const features: FeatureFinding[] = FEATURE_REGISTRY.map((f) => {
    const usage = usageByFeature.get(f.id) || null;
    const core = classifyFeature(f, usage);

    // Ensure details are included from the core classification
    return {
      feature_id: f.id,
      name: f.name,
      group: f.group,
      status: f.status,
      gate: f.gate,
      ...core,
    };
  });

  // 3) API findings (simple): use registry diagnostics unused_defined_apis list (capped)
  //    Also attempt to count api_call events by path prefix (best effort).
  const apiPaths = new Set<string>();

  for (const f of FEATURE_REGISTRY) {
    for (const a of f.apis || []) apiPaths.add(a.path);
  }

  // Pull last 30d api_call counts by path (coarse)
  const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
  const { data: apiEvents, error: apiError } = await supabaseAdmin
    .from("pulse_events")
    .select("path")
    .eq("event_name", "api_call")
    .gte("created_at", since);
  
  if (apiError) {
    console.warn("[DEAD_SWEEPER] Failed to query api_call events:", apiError.message);
  }

  const apiCounts = new Map<string, number>();
  if (apiEvents) {
    for (const row of apiEvents as any[]) {
      const p = row?.path;
      if (typeof p !== "string") continue;
      apiCounts.set(p, (apiCounts.get(p) || 0) + 1);
    }
  }

  // Attribute unowned API calls to features via ownership rules
  const unownedAttribution: Record<string, { api: string; calls_30d: number }[]> = {};
  let reassigned = 0;

  for (const [p, c] of apiCounts.entries()) {
    if (!p.startsWith("/api/")) continue;

    // If registry already defines this api, it's not "unowned" from a path perspective
    const alreadyDefined = apiPaths.has(p) || Array.from(apiPaths).some((x) => p.startsWith(x + "/"));
    if (alreadyDefined) continue;

    const owner = resolveOwnerFeatureIdForApiPath(p);
    if (owner) {
      reassigned += c;
      if (!unownedAttribution[owner]) unownedAttribution[owner] = [];
      unownedAttribution[owner].push({ api: p, calls_30d: c });
    }
  }

  const apis: ApiFinding[] = Array.from(apiPaths).map((api) => {
    // Match counts by exact path or prefix (for /api/foo/:id patterns)
    let calls = 0;
    for (const [p, c] of apiCounts.entries()) {
      if (p === api) calls += c;
      else if (api.includes(":") && p.startsWith(api.split("/:")[0])) calls += c;
      else if (!api.includes(":") && p.startsWith(api + "/")) calls += c;
    }

    const classification: ApiFinding["classification"] = calls > 0 ? "USED" : "ORPHAN";
    const notes: string[] = [];
    if (classification === "ORPHAN") notes.push("No api_call events in last 30d (candidate dead endpoint).");

    return { api, classification, calls_30d: calls, notes };
  });

  // 4) Summary
  const summary = {
    generated_at: new Date().toISOString(),
    lookback_days: config.lookbackDays,
    totals: {
      features: features.length,
      used: features.filter((x) => x.classification === "USED").length,
      dormant: features.filter((x) => x.classification === "DORMANT").length,
      broken: features.filter((x) => x.classification === "BROKEN").length,
      hidden: features.filter((x) => x.classification === "HIDDEN").length,
    },
    apis: {
      total: apis.length,
      used: apis.filter((x) => x.classification === "USED").length,
      orphan: apis.filter((x) => x.classification === "ORPHAN").length,
    },
  };

  // Sort: most urgent first
  features.sort((a, b) => {
    const rank = (s: string) => (s === "S0" ? 0 : s === "S1" ? 1 : s === "S2" ? 2 : 3);
    if (rank(a.severity) !== rank(b.severity)) return rank(a.severity) - rank(b.severity);
    return (b.page_views_30d + b.api_calls_30d) - (a.page_views_30d + a.api_calls_30d);
  });

  apis.sort((a, b) => b.calls_30d - a.calls_30d);

  return { ok: true, summary, features, apis, unownedAttribution, reassignedCalls: reassigned };
}

