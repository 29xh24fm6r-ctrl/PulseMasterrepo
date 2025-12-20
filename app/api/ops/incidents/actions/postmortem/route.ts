// src/app/api/ops/incidents/actions/postmortem/route.ts
import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { writeOpsEvent } from "@/lib/ops/incidents/writeEvent";
import { buildPostmortemFromEvents, type OpsEvent } from "@/lib/ops/incidents/postmortemBuilder";
import { createPostmortemPr } from "@/lib/ops/github/postmortemPr";
import { buildDiffLens } from "@/lib/ops/github/diffLens";
import { buildRootCauseRadar, radarToMarkdown } from "@/lib/ops/incidents/rootCauseRadar";
import { correlateStacksToDiff, correlatorToMarkdown } from "@/lib/ops/incidents/stackTraceCorrelator";
import { breadcrumbsToMarkdown } from "@/lib/ops/incidents/breadcrumbReplayMd";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const token = req.headers.get("x-war-room-token") || "";
    const expected = process.env.WAR_ROOM_ADMIN_TOKEN || "";

    if (!expected || token !== expected) {
      return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
    }

    const owner = process.env.GITHUB_OWNER || "";
    const repo = process.env.GITHUB_REPO || "";
    const baseBranch = process.env.GITHUB_BASE_BRANCH || "main";
    const ghToken = process.env.GITHUB_ACTIONS_PAT || "";

    if (!owner || !repo || !ghToken) {
      return NextResponse.json(
        { ok: false, error: "missing_env:GITHUB_OWNER/GITHUB_REPO/GITHUB_ACTIONS_PAT" },
        { status: 500 }
      );
    }

    const sb = supabaseAdmin();

    const { data: events, error } = await sb
      .from("ops_incident_events")
      .select("id, created_at, source, event_type, level, summary, link, payload")
      .order("created_at", { ascending: false })
      .limit(200);

    if (error) {
      return NextResponse.json({ ok: false, error: `events_fetch_failed:${error.message}` }, { status: 500 });
    }

    const evts = (events ?? []) as OpsEvent[];

    // 1) Build Diff Lens
    let diff: any = null;
    let suspectSha: string | null = null;

    try {
      const rollback = evts.find((e) => e.event_type === "rollback_pr_created") ?? null;
      const smokeFail = evts.find((e) => e.event_type === "smoke_failed") ?? null;

      suspectSha =
        (rollback?.payload?.reverted_merge_sha ? String(rollback.payload.reverted_merge_sha) : null) ||
        (smokeFail?.payload?.triggering_head_sha ? String(smokeFail.payload.triggering_head_sha) : null) ||
        null;

      diff = await buildDiffLens({ owner, repo, token: ghToken }, suspectSha);

      await writeOpsEvent({
        source: "app",
        event_type: "diff_lens_built",
        level: diff.ok ? "success" : "warn",
        summary: diff.ok ? `Diff Lens built for ${diff.suspectSha?.slice(0, 8)}` : `Diff Lens skipped: ${diff.note ?? "unknown"}`,
        link: diff.compareUrl ?? null,
        payload: {
          suspectSha: diff.suspectSha,
          parentSha: diff.parentSha,
          prUrl: diff.prUrl,
          filesCount: diff.files?.length ?? 0,
        },
      });
    } catch (e: any) {
      await writeOpsEvent({
        source: "app",
        event_type: "diff_lens_failed",
        level: "warn",
        summary: "Diff Lens failed (postmortem will still be created)",
        payload: { error: e?.message ?? String(e), suspectSha },
      });
      diff = null;
    }

    // 2) Stack Trace Correlator: pull recent app_error/server_error stacks (best-effort)
    const stackEvents = evts.filter((e) => e.event_type === "app_error" || e.event_type === "server_error");
    const stacks = stackEvents
      .map((e) => (e.payload?.stack ? String(e.payload.stack) : ""))
      .filter((s) => s && s.length >= 10)
      .slice(0, 20);

    const correlator = correlateStacksToDiff({ diff, stacks });
    const correlatorMd = correlatorToMarkdown(correlator);

    // 2B) Breadcrumb Replay: extract breadcrumbs from error events
    const breadcrumbBlobs = stackEvents
      .map((e) => e.payload?.meta?.breadcrumbs || e.payload?.breadcrumbs || null)
      .filter(Boolean);

    // Flatten best-effort
    const flatBreadcrumbs = breadcrumbBlobs.flat().slice(0, 60);
    const breadcrumbMd = breadcrumbsToMarkdown(flatBreadcrumbs);

    await writeOpsEvent({
      source: "app",
      event_type: "stack_trace_correlated",
      level: correlator.ok ? "success" : "warn",
      summary: correlator.ok
        ? `Stack Trace Correlator ran (${correlator.matchedFiles?.length ?? 0} match(es))`
        : "Stack Trace Correlator unavailable",
      payload: {
        suspectSha: diff?.suspectSha ?? suspectSha,
        matches: (correlator.matchedFiles ?? []).slice(0, 10),
      },
    });

    await writeOpsEvent({
      source: "app",
      event_type: "breadcrumb_replay_attached",
      level: flatBreadcrumbs.length ? "success" : "warn",
      summary: flatBreadcrumbs.length
        ? `Breadcrumb replay attached (${flatBreadcrumbs.length} crumb(s))`
        : "Breadcrumb replay empty",
      payload: { count: flatBreadcrumbs.length },
    });

    // 3) Build Root Cause Radar from Diff Lens + Correlator
    let radarMd: string | null = null;
    try {
      const radar = buildRootCauseRadar(diff, correlator.ok ? {
        matchedFiles: correlator.matchedFiles.map((m) => ({ file: m.file, count: m.count })),
      } : null);
      radarMd = radarToMarkdown(radar);

      await writeOpsEvent({
        source: "app",
        event_type: "root_cause_radar_built",
        level: radar.ok ? "success" : "warn",
        summary: radar.ok ? `Root Cause Radar built (${radar.topHits?.length ?? 0} suspect(s))` : "Root Cause Radar unavailable",
        payload: {
          suspectSha: diff?.suspectSha ?? suspectSha,
          flags: radar.globalFlags ?? [],
          top: (radar.topHits ?? []).map((h) => ({ file: h.file, score: h.score })),
        },
      });
    } catch (e: any) {
      await writeOpsEvent({
        source: "app",
        event_type: "root_cause_radar_failed",
        level: "warn",
        summary: "Root Cause Radar failed (postmortem will still be created)",
        payload: { error: e?.message ?? String(e) },
      });
      radarMd = null;
    }

    // 4) Build postmortem markdown (Diff Lens + Radar + Correlator + Breadcrumbs included)
    const radarPlus = (radarMd ? radarMd : "") + "\n" + correlatorMd + "\n" + breadcrumbMd;
    const built = buildPostmortemFromEvents(evts, diff, radarPlus);

    const date = new Date().toISOString().slice(0, 10);
    const safeId = built.incidentId.replace(/[^a-z0-9\-]/gi, "").toLowerCase();

    const branch = `postmortem/auto-${date}-${safeId}`;
    const filePath = `docs/postmortems/${date}-incident-${safeId}.md`;
    const prTitle = `POSTMORTEM: ${date} ${built.title}`;
    const prBody = `This PR was generated by the **War Room Postmortem Bot** (Diff Lens + Root Cause Radar + Stack Trace Correlator).

- Incident ID: \`${built.incidentId}\`
- Window: ${built.window.start ?? "—"} → ${built.window.end ?? "—"}
${built.keyLinks.smokeFailUrl ? `- Failing smoke: ${built.keyLinks.smokeFailUrl}\n` : ""}${built.keyLinks.rollbackPrUrl ? `- Rollback PR: ${built.keyLinks.rollbackPrUrl}\n` : ""}${built.keyLinks.compareUrl ? `- Compare: ${built.keyLinks.compareUrl}\n` : ""}${built.keyLinks.suspectPrUrl ? `- Suspect PR: ${built.keyLinks.suspectPrUrl}\n` : ""}

Edit the markdown doc and merge when ready.`;

    const result = await createPostmortemPr(
      { owner, repo, token: ghToken, baseBranch },
      {
        title: prTitle,
        body: prBody,
        branch,
        filePath,
        fileContent: built.markdown,
        commitMessage: `postmortem: ${date} ${built.incidentId}`,
      }
    );

    await writeOpsEvent({
      source: "app",
      event_type: "postmortem_pr_created",
      level: "success",
      summary: `Postmortem PR created: #${result.prNumber}`,
      link: result.prUrl,
      payload: {
        incident_id: built.incidentId,
        branch: result.branch,
        filePath: result.filePath,
        prNumber: result.prNumber,
        window: built.window,
        suspectSha: built.suspectSha,
        compareUrl: built.keyLinks.compareUrl,
        suspectPrUrl: built.keyLinks.suspectPrUrl,
      },
    });

    return NextResponse.json({ ok: true, pr: result });
  } catch (e: any) {
    try {
      await writeOpsEvent({
        source: "app",
        event_type: "postmortem_pr_failed",
        level: "error",
        summary: `Postmortem PR creation failed`,
        payload: { error: e?.message ?? String(e) },
      });
    } catch {}

    return NextResponse.json({ ok: false, error: e?.message ?? "unknown_error" }, { status: 500 });
  }
}
