// src/app/api/ops/incidents/status/route.ts
import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { getRollbackAutoMergeFreeze } from "@/lib/ops/incidents/freeze";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function repoMeta() {
  const owner = process.env.GITHUB_OWNER || "";
  const repo = process.env.GITHUB_REPO || "";
  const repoUrl = owner && repo ? `https://github.com/${owner}/${repo}` : null;
  return { owner: owner || null, repo: repo || null, repoUrl };
}

function pickLatest(evts: any[], type: string) {
  return evts.find((e) => e.event_type === type) ?? null;
}

function isAfter(a: any, b: any) {
  if (!a || !b) return false;
  return String(a.created_at) > String(b.created_at);
}

function extractBreadcrumbsFromEvents(evts: any[]) {
  // Pull the newest breadcrumbs we can find, from app_error/server_error payload.meta.breadcrumbs
  for (const e of evts) {
    if (e.event_type !== "app_error" && e.event_type !== "server_error") continue;
    const b = e?.payload?.meta?.breadcrumbs ?? e?.payload?.breadcrumbs ?? null;
    if (Array.isArray(b) && b.length) return b;
  }
  return [];
}

function extractApiPathsFromBreadcrumbs(breadcrumbs: any[]) {
  const out: string[] = [];
  for (const b of breadcrumbs || []) {
    const data = b?.data || {};
    const url = data?.url || data?.path || null;
    if (typeof url === "string") {
      if (url.startsWith("/api/")) out.push(url.split("?")[0]);
      else if (url.startsWith("http://") || url.startsWith("https://")) {
        try {
          const u = new URL(url);
          if (u.pathname.startsWith("/api/")) out.push(u.pathname);
        } catch {}
      }
    }
  }
  return Array.from(new Set(out)).slice(0, 25);
}

export async function GET() {
  const sb = supabaseAdmin();

  const { data: events, error } = await sb
    .from("ops_incident_events")
    .select("id, created_at, source, event_type, level, summary, link, payload")
    .order("created_at", { ascending: false })
    .limit(400);

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  const evts = events ?? [];

  // Core state
  const latestSmokeFail = pickLatest(evts, "smoke_failed");
  const latestSmokePass = pickLatest(evts, "smoke_passed");

  const latestRollbackPr = pickLatest(evts, "rollback_pr_created");
  const latestCanaryGreen = pickLatest(evts, "canary_green_applied");
  const latestRollbackMerged = pickLatest(evts, "rollback_merged");

  // Evidence state (best-effort)
  const latestDiffLens = pickLatest(evts, "diff_lens_built");
  const latestBreadcrumbRoute = pickLatest(evts, "breadcrumb_route_correlated");
  const latestStackCorrelated = pickLatest(evts, "stack_trace_correlated");

  // Radar may exist as its own event, OR as a payload nested elsewhere.
  const latestRadar =
    pickLatest(evts, "root_cause_radar_built") ||
    pickLatest(evts, "root_cause_radar") ||
    null;

  // Breadcrumb replay inputs for "replay incident"
  const breadcrumbs = extractBreadcrumbsFromEvents(evts);
  const apiPathsFromBreadcrumbs = extractApiPathsFromBreadcrumbs(breadcrumbs);

  const prodHealth =
    latestSmokePass && (!latestSmokeFail || isAfter(latestSmokePass, latestSmokeFail))
      ? { status: "green", last: latestSmokePass.created_at, link: latestSmokePass.link }
      : latestSmokeFail
        ? { status: "red", last: latestSmokeFail.created_at, link: latestSmokeFail.link }
        : { status: "unknown", last: null, link: null };

  const rollback = latestRollbackPr
    ? {
        status:
          latestRollbackMerged && isAfter(latestRollbackMerged, latestRollbackPr)
            ? "merged"
            : latestCanaryGreen && isAfter(latestCanaryGreen, latestRollbackPr)
              ? "armed"
              : "pending",
        prUrl: latestRollbackPr.link ?? null,
        branch: (latestRollbackPr.payload as any)?.branch ?? null,
        createdAt: latestRollbackPr.created_at,
      }
    : { status: "none", prUrl: null, branch: null, createdAt: null };

  const freeze = await getRollbackAutoMergeFreeze();

  // Normalize "top suspects" list from whatever radar payload shape exists
  const radarTop = (() => {
    const p: any = latestRadar?.payload ?? null;
    const arr =
      (Array.isArray(p?.top) && p.top) ||
      (Array.isArray(p?.hits) && p.hits) ||
      (Array.isArray(p?.ranked) && p.ranked) ||
      [];
    return arr
      .slice(0, 8)
      .map((x: any) => ({
        file: x.file || x.path || x.filename || null,
        score: typeof x.score === "number" ? x.score : null,
        why: x.why || x.reason || x.summary || null,
      }))
      .filter((x: any) => x.file);
  })();

  const evidence = {
    suspectSha: (latestDiffLens?.payload as any)?.suspectSha ?? null,
    parentSha: (latestDiffLens?.payload as any)?.parentSha ?? null,
    compareUrl: latestDiffLens?.link ?? null,
    suspectPrUrl: (latestDiffLens?.payload as any)?.prUrl ?? null,

    breadcrumbRouteMatches: ((latestBreadcrumbRoute?.payload as any)?.matches ?? []) as Array<{
      file: string;
      count: number;
    }>,
    breadcrumbRouteUnmatched: ((latestBreadcrumbRoute?.payload as any)?.unmatched ?? []) as string[],

    stackMatches: ((latestStackCorrelated?.payload as any)?.matches ?? []) as Array<{
      file: string;
      count: number;
      line?: number | null;
      col?: number | null;
    }>,

    radarTop,

    // Replay inputs
    lastBreadcrumbs: breadcrumbs.slice(-30),
    apiPathsFromBreadcrumbs,
    lastSmokeUrl: (latestSmokeFail?.payload as any)?.url ?? (latestSmokePass?.payload as any)?.url ?? null,
  };

  return NextResponse.json({
    ok: true,
    repo: repoMeta(),
    state: {
      prodHealth,
      rollback,
      freeze,
      evidence,
      signals: {
        lastSmokePass: latestSmokePass?.created_at ?? null,
        lastSmokeFail: latestSmokeFail?.created_at ?? null,
        lastRollbackCreated: latestRollbackPr?.created_at ?? null,
        lastCanaryGreen: latestCanaryGreen?.created_at ?? null,
        lastRollbackMerged: latestRollbackMerged?.created_at ?? null,
        lastDiffLens: latestDiffLens?.created_at ?? null,
        lastBreadcrumbRoute: latestBreadcrumbRoute?.created_at ?? null,
        lastStackCorrelated: latestStackCorrelated?.created_at ?? null,
        lastRadar: latestRadar?.created_at ?? null,
      },
    },
    events: evts,
  });
}
