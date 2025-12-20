// src/components/ops/IncidentWarRoom.tsx
"use client";

import { useEffect, useMemo, useState } from "react";

type OpsEvent = {
  id: string;
  created_at: string;
  source: string;
  event_type: string;
  level: "info" | "warn" | "error" | "success";
  summary: string;
  link: string | null;
  payload: any;
};

type FreezeState = {
  enabled: boolean;
  reason: string | null;
  updated_at: string | null;
};

type StatusResponse = {
  ok: boolean;
  repo: { owner: string | null; repo: string | null; repoUrl: string | null };
  state: {
    prodHealth: { status: "green" | "red" | "unknown"; last: string | null; link: string | null };
    rollback: { status: "none" | "pending" | "armed" | "merged"; prUrl: string | null; branch: string | null; createdAt: string | null };
    freeze: FreezeState;
    evidence: {
      suspectSha: string | null;
      parentSha: string | null;
      compareUrl: string | null;
      suspectPrUrl: string | null;

      breadcrumbRouteMatches: { file: string; count: number }[];
      breadcrumbRouteUnmatched: string[];

      stackMatches: { file: string; count: number; line?: number | null; col?: number | null }[];

      radarTop: { file: string; score: number | null; why: string | null }[];

      lastBreadcrumbs: any[];
      apiPathsFromBreadcrumbs: string[];
      lastSmokeUrl: string | null;
    };
    signals: Record<string, string | null>;
  };
  events: OpsEvent[];
  error?: string;
};

function fmt(ts: string | null) {
  if (!ts) return "—";
  const d = new Date(ts);
  return d.toLocaleString();
}

function shortSha(sha: string | null) {
  if (!sha) return null;
  return sha.slice(0, 8);
}

function pillClass(level: string) {
  if (level === "error") return "bg-red-500/15 text-red-700 border-red-500/30";
  if (level === "warn") return "bg-yellow-500/15 text-yellow-700 border-yellow-500/30";
  if (level === "success") return "bg-green-500/15 text-green-700 border-green-500/30";
  return "bg-blue-500/10 text-blue-700 border-blue-500/20";
}

async function postJson(url: string, body: any, token: string) {
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-war-room-token": token,
    },
    body: JSON.stringify(body ?? {}),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok || json?.ok === false) {
    throw new Error(json?.error || `request_failed:${res.status}`);
  }
  return json;
}

function buildFileUrl(repoUrl: string | null, sha: string | null, file: string, line?: number | null) {
  if (!repoUrl || !sha) return null;
  const base = `${repoUrl}/blob/${sha}/${file}`;
  if (line && Number.isFinite(line)) return `${base}#L${line}`;
  return base;
}

type TabKey = "summary" | "suspects" | "stack" | "routes" | "breadcrumbs" | "diff" | "timeline";

export default function IncidentWarRoom() {
  const [data, setData] = useState<StatusResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState<null | "rollback" | "smoke" | "freeze" | "postmortem" | "replay">(null);

  const [tab, setTab] = useState<TabKey>("summary");

  const [adminToken, setAdminToken] = useState<string>(() => {
    if (typeof window === "undefined") return "";
    return window.localStorage.getItem("war_room_admin_token") || "";
  });

  function saveToken(t: string) {
    setAdminToken(t);
    if (typeof window !== "undefined") {
      window.localStorage.setItem("war_room_admin_token", t);
    }
  }

  async function refresh() {
    try {
      setErr(null);
      const res = await fetch("/api/ops/incidents/status", { cache: "no-store" });
      const json = (await res.json()) as StatusResponse;
      if (!json.ok) throw new Error(json.error || "status_fetch_failed");
      setData(json);
    } catch (e: any) {
      setErr(e?.message ?? "unknown_error");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refresh();
    const t = setInterval(refresh, 8000);
    return () => clearInterval(t);
  }, []);

  const repoUrl = data?.repo.repoUrl ?? null;
  const suspectSha = data?.state.evidence.suspectSha ?? null;

  const prod = data?.state.prodHealth;
  const rb = data?.state.rollback;
  const freeze = data?.state.freeze;

  const evidence = data?.state.evidence;

  const headline = useMemo(() => {
    if (!prod) return "Loading…";
    if (prod.status === "red") return "🚨 Prod health is RED";
    if (prod.status === "green") return "✅ Prod health is GREEN";
    return "🟦 Prod health is UNKNOWN";
  }, [prod?.status]);

  const freezeBanner = freeze?.enabled
    ? `🧊 FREEZE ACTIVE — rollback auto-merge is paused${freeze.reason ? `: ${freeze.reason}` : ""}`
    : null;

  function openUrl(url: string | null) {
    if (!url) return;
    window.open(url, "_blank", "noopener,noreferrer");
  }

  function openTopFilesFromList(items: { file: string; line?: number | null }[], n: number) {
    if (!repoUrl || !suspectSha) {
      alert("Missing repoUrl or suspectSha. Run Create Postmortem Draft first so Diff Lens resolves the suspect SHA.");
      return;
    }
    const top = items.slice(0, Math.max(1, Math.min(10, n)));
    for (const it of top) {
      const url = buildFileUrl(repoUrl, suspectSha, it.file, it.line ?? null);
      if (url) window.open(url, "_blank", "noopener,noreferrer");
    }
  }

  async function handleDispatchRollback() {
    setBusy("rollback");
    try {
      await postJson("/api/ops/incidents/actions/rollback", { note: "War Room manual dispatch" }, adminToken);
      await refresh();
      alert("Auto-rollback workflow dispatched.");
    } catch (e: any) {
      alert(`Dispatch failed: ${e?.message ?? "unknown_error"}`);
    } finally {
      setBusy(null);
    }
  }

  async function handleDispatchSmoke() {
    setBusy("smoke");
    try {
      const rollback_head_ref = rb?.branch || "";
      await postJson("/api/ops/incidents/actions/smoke", rollback_head_ref ? { rollback_head_ref } : {}, adminToken);
      await refresh();
      alert(`Smoke dispatched${rollback_head_ref ? ` for ${rollback_head_ref}` : ""}.`);
    } catch (e: any) {
      alert(`Smoke failed: ${e?.message ?? "unknown_error"}`);
    } finally {
      setBusy(null);
    }
  }

  async function handleToggleFreeze() {
    setBusy("freeze");
    try {
      const nextEnabled = !Boolean(freeze?.enabled);
      const reason = nextEnabled ? prompt("Freeze reason (optional):") || "" : "";
      await postJson("/api/ops/incidents/actions/freeze", { enabled: nextEnabled, reason: reason || null }, adminToken);
      await refresh();
      alert(nextEnabled ? "Freeze enabled." : "Freeze disabled.");
    } catch (e: any) {
      alert(`Freeze toggle failed: ${e?.message ?? "unknown_error"}`);
    } finally {
      setBusy(null);
    }
  }

  async function handleCreatePostmortem() {
    setBusy("postmortem");
    try {
      const json = await postJson("/api/ops/incidents/actions/postmortem", {}, adminToken);
      await refresh();
      const url = json?.pr?.prUrl;
      alert(url ? `Postmortem PR created: ${url}` : "Postmortem PR created.");
      if (url) window.open(url, "_blank", "noopener,noreferrer");
    } catch (e: any) {
      alert(`Postmortem failed: ${e?.message ?? "unknown_error"}`);
    } finally {
      setBusy(null);
    }
  }

  async function handleReplayIncident() {
    setBusy("replay");
    try {
      const json = await postJson("/api/ops/incidents/actions/replay", { maxPaths: 6, alsoRunSmoke: true }, adminToken);
      await refresh();
      const okCount = (json?.probes || []).filter((p: any) => p.ok).length;
      alert(`Replay complete. Probes OK: ${okCount}/${(json?.probes || []).length}`);
      setTab("timeline");
    } catch (e: any) {
      alert(`Replay failed: ${e?.message ?? "unknown_error"}`);
    } finally {
      setBusy(null);
    }
  }

  const tabButton = (k: TabKey, label: string) => (
    <button
      onClick={() => setTab(k)}
      className={`rounded-xl border px-3 py-2 text-sm ${tab === k ? "bg-muted" : "hover:bg-muted"}`}
    >
      {label}
    </button>
  );

  const topSuspects = (evidence?.radarTop ?? []).slice(0, 5);
  const stackMatches = (evidence?.stackMatches ?? []).slice().sort((a, b) => (b.count || 0) - (a.count || 0));
  const routeMatches = (evidence?.breadcrumbRouteMatches ?? []).slice().sort((a, b) => b.count - a.count);

  return (
    <div className="space-y-6">
      {freezeBanner ? (
        <div className="rounded-2xl border p-4 bg-yellow-500/10">
          <div className="font-semibold">{freezeBanner}</div>
          <div className="text-sm text-muted-foreground mt-1">Updated: {fmt(freeze?.updated_at ?? null)}</div>
        </div>
      ) : null}

      {/* ONE SCREEN: Summary + Actions */}
      <div className="rounded-2xl border p-5 shadow-sm bg-background">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="text-lg font-semibold">{headline}</div>
            <div className="text-sm text-muted-foreground">Last change: {fmt(prod?.last ?? null)}</div>
            <div className="text-xs text-muted-foreground mt-1">
              Repo:{" "}
              {repoUrl ? (
                <a className="underline" href={repoUrl} target="_blank" rel="noreferrer">
                  {data?.repo.owner}/{data?.repo.repo}
                </a>
              ) : (
                "—"
              )}
              {suspectSha ? (
                <>
                  {" "}
                  · Suspect SHA: <span className="font-mono">{shortSha(suspectSha)}</span>
                </>
              ) : null}
            </div>
          </div>
          <button
            onClick={refresh}
            className="rounded-xl border px-3 py-2 text-sm hover:bg-muted"
            disabled={loading}
          >
            Refresh
          </button>
        </div>

        <div className="mt-4 grid grid-cols-1 lg:grid-cols-4 gap-4">
          <div className="rounded-2xl border p-4">
            <div className="text-sm text-muted-foreground">Prod Smoke</div>
            <div className="mt-1 text-xl font-semibold">
              {prod?.status === "green" ? "GREEN" : prod?.status === "red" ? "RED" : "UNKNOWN"}
            </div>
            <div className="mt-2 text-sm text-muted-foreground">Last: {fmt(prod?.last ?? null)}</div>
            {prod?.link ? (
              <a className="text-sm underline" href={prod.link} target="_blank" rel="noreferrer">
                Open smoke run
              </a>
            ) : null}
          </div>

          <div className="rounded-2xl border p-4">
            <div className="text-sm text-muted-foreground">Rollback</div>
            <div className="mt-1 text-xl font-semibold">
              {rb?.status === "none" ? "IDLE" : rb?.status === "pending" ? "PENDING" : rb?.status === "armed" ? "ARMED" : "MERGED"}
            </div>
            <div className="mt-2 text-sm text-muted-foreground">
              Branch: <span className="font-mono">{rb?.branch ?? "—"}</span>
            </div>
            {rb?.prUrl ? (
              <a className="text-sm underline" href={rb.prUrl} target="_blank" rel="noreferrer">
                Open rollback PR
              </a>
            ) : null}
          </div>

          <div className="rounded-2xl border p-4">
            <div className="text-sm text-muted-foreground">Admin Token</div>
            <div className="mt-2">
              <input
                value={adminToken}
                onChange={(e) => saveToken(e.target.value)}
                placeholder="Paste WAR_ROOM_ADMIN_TOKEN"
                className="w-full rounded-xl border px-3 py-2 text-sm bg-background"
              />
              <div className="text-xs text-muted-foreground mt-2">Stored locally. Replace later with role-based auth.</div>
            </div>
          </div>

          <div className="rounded-2xl border p-4">
            <div className="text-sm text-muted-foreground">Actions</div>
            <div className="mt-3 grid grid-cols-1 gap-2">
              <button
                className="rounded-xl border px-3 py-2 text-sm hover:bg-muted disabled:opacity-50"
                onClick={handleDispatchSmoke}
                disabled={!adminToken || busy !== null}
              >
                {busy === "smoke" ? "Running…" : "Run Smoke Now"}
              </button>

              <button
                className="rounded-xl border px-3 py-2 text-sm hover:bg-muted disabled:opacity-50"
                onClick={handleReplayIncident}
                disabled={!adminToken || busy !== null}
                title="Replays the last /api calls found in breadcrumbs and triggers smoke (best-effort)"
              >
                {busy === "replay" ? "Replaying…" : "Replay Incident"}
              </button>

              <button
                className="rounded-xl border px-3 py-2 text-sm hover:bg-muted disabled:opacity-50"
                onClick={handleCreatePostmortem}
                disabled={!adminToken || busy !== null}
              >
                {busy === "postmortem" ? "Creating…" : "Create Postmortem Draft"}
              </button>

              <button
                className="rounded-xl border px-3 py-2 text-sm hover:bg-muted disabled:opacity-50"
                onClick={handleDispatchRollback}
                disabled={!adminToken || busy !== null}
              >
                {busy === "rollback" ? "Dispatching…" : "Generate Rollback PR Now"}
              </button>

              <button
                className="rounded-xl border px-3 py-2 text-sm hover:bg-muted disabled:opacity-50"
                onClick={handleToggleFreeze}
                disabled={!adminToken || busy !== null}
              >
                {busy === "freeze" ? "Updating…" : freeze?.enabled ? "Unfreeze Auto-Merge" : "Freeze Auto-Merge"}
              </button>

              <div className="flex gap-2 pt-2">
                <button
                  className="flex-1 rounded-xl border px-3 py-2 text-sm hover:bg-muted disabled:opacity-50"
                  onClick={() => openUrl(evidence?.compareUrl ?? null)}
                  disabled={!evidence?.compareUrl}
                >
                  Open Compare
                </button>
                <button
                  className="flex-1 rounded-xl border px-3 py-2 text-sm hover:bg-muted disabled:opacity-50"
                  onClick={() => openUrl(evidence?.suspectPrUrl ?? null)}
                  disabled={!evidence?.suspectPrUrl}
                >
                  Open Suspect PR
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Top suspects quick list */}
        <div className="mt-6 rounded-2xl border p-4">
          <div className="flex items-center justify-between gap-4">
            <div>
              <div className="text-lg font-semibold">Top Suspects</div>
              <div className="text-sm text-muted-foreground">From Root Cause Radar (when available), boosted by correlators.</div>
            </div>
            <div className="flex gap-2">
              <button
                className="rounded-xl border px-3 py-2 text-sm hover:bg-muted disabled:opacity-50"
                onClick={() => openTopFilesFromList(stackMatches.map((m) => ({ file: m.file, line: m.line ?? null })), 3)}
                disabled={!stackMatches.length || !repoUrl || !suspectSha}
                title="Opens the top stack-correlated files at exact line (if available)"
              >
                Open Stack Top 3
              </button>
              <button
                className="rounded-xl border px-3 py-2 text-sm hover:bg-muted disabled:opacity-50"
                onClick={() => openTopFilesFromList(routeMatches.map((m) => ({ file: m.file })), 3)}
                disabled={!routeMatches.length || !repoUrl || !suspectSha}
                title="Opens the top breadcrumb-route-correlated route files"
              >
                Open Route Top 3
              </button>
            </div>
          </div>

          <div className="mt-4 divide-y">
            {topSuspects.length ? (
              topSuspects.map((s) => (
                <div key={s.file} className="py-2 flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="font-mono text-sm truncate">{s.file}</div>
                    <div className="text-xs text-muted-foreground">
                      {s.score !== null ? `Score: ${Math.round(s.score)}` : "Score: —"}
                      {s.why ? ` · ${s.why}` : ""}
                    </div>
                  </div>
                  <button
                    className="rounded-xl border px-3 py-2 text-sm hover:bg-muted disabled:opacity-50"
                    onClick={() => {
                      const url = buildFileUrl(repoUrl, suspectSha, s.file, null);
                      openUrl(url);
                    }}
                    disabled={!repoUrl || !suspectSha}
                  >
                    Open File
                  </button>
                </div>
              ))
            ) : (
              <div className="py-4 text-sm text-muted-foreground">
                Radar not available yet. Run <span className="font-semibold">Create Postmortem Draft</span> after an incident to populate suspects.
              </div>
            )}
          </div>
        </div>

        {/* Tabs */}
        <div className="mt-6 flex flex-wrap gap-2">
          {tabButton("summary", "Summary")}
          {tabButton("suspects", "Suspects")}
          {tabButton("stack", "Stack")}
          {tabButton("routes", "Routes")}
          {tabButton("breadcrumbs", "Breadcrumbs")}
          {tabButton("diff", "Diff")}
          {tabButton("timeline", "Timeline")}
        </div>

        {/* Tab content */}
        <div className="mt-4 rounded-2xl border p-4">
          {tab === "summary" ? (
            <div className="space-y-2 text-sm">
              <div>
                <span className="text-muted-foreground">Smoke:</span> {prod?.status ?? "—"} · last {fmt(prod?.last ?? null)}
              </div>
              <div>
                <span className="text-muted-foreground">Rollback:</span> {rb?.status ?? "—"} · branch{" "}
                <span className="font-mono">{rb?.branch ?? "—"}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Replay inputs:</span>{" "}
                {evidence?.apiPathsFromBreadcrumbs?.length
                  ? `${evidence.apiPathsFromBreadcrumbs.length} api path(s) available`
                  : "no api paths found (need breadcrumbs)"}
              </div>
            </div>
          ) : null}

          {tab === "suspects" ? (
            <div className="space-y-3">
              <div className="text-sm text-muted-foreground">Radar Top Hits</div>
              <div className="divide-y">
                {(evidence?.radarTop ?? []).slice(0, 12).map((s) => (
                  <div key={s.file} className="py-2 flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="font-mono text-sm truncate">{s.file}</div>
                      <div className="text-xs text-muted-foreground">
                        {s.score !== null ? `Score: ${Math.round(s.score)}` : "Score: —"}
                        {s.why ? ` · ${s.why}` : ""}
                      </div>
                    </div>
                    <button
                      className="rounded-xl border px-3 py-2 text-sm hover:bg-muted disabled:opacity-50"
                      onClick={() => openUrl(buildFileUrl(repoUrl, suspectSha, s.file, null))}
                      disabled={!repoUrl || !suspectSha}
                    >
                      Open
                    </button>
                  </div>
                ))}
                {!(evidence?.radarTop ?? []).length ? (
                  <div className="py-3 text-sm text-muted-foreground">No radar hits available yet.</div>
                ) : null}
              </div>
            </div>
          ) : null}

          {tab === "stack" ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="text-sm text-muted-foreground">Stack Matches (opens exact line)</div>
                <button
                  className="rounded-xl border px-3 py-2 text-sm hover:bg-muted disabled:opacity-50"
                  onClick={() => openTopFilesFromList(stackMatches.map((m) => ({ file: m.file, line: m.line ?? null })), 6)}
                  disabled={!stackMatches.length || !repoUrl || !suspectSha}
                >
                  Open Top 6
                </button>
              </div>
              <div className="divide-y">
                {stackMatches.slice(0, 16).map((m) => {
                  const url = buildFileUrl(repoUrl, suspectSha, m.file, m.line ?? null);
                  return (
                    <div key={m.file} className="py-2 flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <div className="font-mono text-sm truncate">{m.file}</div>
                        <div className="text-xs text-muted-foreground">
                          frames: {m.count}
                          {m.line ? ` · L${m.line}${m.col ? `:${m.col}` : ""}` : ""}
                        </div>
                      </div>
                      <button
                        className="rounded-xl border px-3 py-2 text-sm hover:bg-muted disabled:opacity-50"
                        onClick={() => openUrl(url)}
                        disabled={!url}
                      >
                        {m.line ? `Open @ L${m.line}` : "Open"}
                      </button>
                    </div>
                  );
                })}
                {!stackMatches.length ? <div className="py-3 text-sm text-muted-foreground">No stack matches yet.</div> : null}
              </div>
            </div>
          ) : null}

          {tab === "routes" ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="text-sm text-muted-foreground">Matched Route Files</div>
                <button
                  className="rounded-xl border px-3 py-2 text-sm hover:bg-muted disabled:opacity-50"
                  onClick={() => openTopFilesFromList(routeMatches.map((m) => ({ file: m.file })), 6)}
                  disabled={!routeMatches.length || !repoUrl || !suspectSha}
                >
                  Open Top 6
                </button>
              </div>
              <div className="divide-y">
                {routeMatches.slice(0, 16).map((m) => (
                  <div key={m.file} className="py-2 flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <div className="font-mono text-sm truncate">{m.file}</div>
                      <div className="text-xs text-muted-foreground">breadcrumb hits: {m.count}</div>
                    </div>
                    <button
                      className="rounded-xl border px-3 py-2 text-sm hover:bg-muted disabled:opacity-50"
                      onClick={() => openUrl(buildFileUrl(repoUrl, suspectSha, m.file, null))}
                      disabled={!repoUrl || !suspectSha}
                    >
                      Open
                    </button>
                  </div>
                ))}
                {!routeMatches.length ? <div className="py-3 text-sm text-muted-foreground">No route matches yet.</div> : null}
              </div>
            </div>
          ) : null}

          {tab === "breadcrumbs" ? (
            <div className="space-y-3">
              <div className="text-sm text-muted-foreground">Latest Breadcrumbs (sample)</div>
              <div className="divide-y">
                {(evidence?.lastBreadcrumbs ?? []).slice(-30).map((b, idx) => (
                  <div key={idx} className="py-2">
                    <div className="text-xs text-muted-foreground">{b?.ts ? String(b.ts).replace("T", " ").slice(0, 19) + "Z" : "—"}</div>
                    <div className="text-sm">
                      <span className="font-mono">{b?.type || "info"}</span> — {b?.name || "event"}
                    </div>
                    {b?.data ? (
                      <div className="text-xs text-muted-foreground font-mono break-all">
                        {JSON.stringify(b.data).slice(0, 350)}
                      </div>
                    ) : null}
                  </div>
                ))}
                {!(evidence?.lastBreadcrumbs ?? []).length ? (
                  <div className="py-3 text-sm text-muted-foreground">No breadcrumbs found yet (need app_error/server_error capture).</div>
                ) : null}
              </div>

              <div className="pt-2 text-sm text-muted-foreground">
                API paths available for replay: {(evidence?.apiPathsFromBreadcrumbs ?? []).length}
              </div>
              {(evidence?.apiPathsFromBreadcrumbs ?? []).length ? (
                <div className="text-xs font-mono text-muted-foreground">
                  {(evidence?.apiPathsFromBreadcrumbs ?? []).slice(0, 10).join(" · ")}
                </div>
              ) : null}
            </div>
          ) : null}

          {tab === "diff" ? (
            <div className="space-y-2 text-sm">
              <div>
                <span className="text-muted-foreground">Compare:</span>{" "}
                {evidence?.compareUrl ? (
                  <a className="underline" href={evidence.compareUrl} target="_blank" rel="noreferrer">
                    Open compare
                  </a>
                ) : (
                  "—"
                )}
              </div>
              <div>
                <span className="text-muted-foreground">Suspect PR:</span>{" "}
                {evidence?.suspectPrUrl ? (
                  <a className="underline" href={evidence.suspectPrUrl} target="_blank" rel="noreferrer">
                    Open PR
                  </a>
                ) : (
                  "—"
                )}
              </div>
              <div className="text-xs text-muted-foreground">
                (Diff file list is currently best viewed via Compare until we expose the full file list in status.)
              </div>
            </div>
          ) : null}

          {tab === "timeline" ? (
            <div className="space-y-2">
              {err ? <div className="text-sm text-red-600">Error: {err}</div> : null}
              <div className="divide-y">
                {(data?.events ?? []).slice(0, 120).map((e) => (
                  <div key={e.id} className="py-3 flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className={`text-xs border rounded-full px-2 py-0.5 ${pillClass(e.level)}`}>
                          {e.level.toUpperCase()}
                        </span>
                        <span className="text-xs text-muted-foreground">{e.source}</span>
                        <span className="text-xs text-muted-foreground font-mono">{e.event_type}</span>
                      </div>
                      <div className="mt-1 text-sm">{e.summary}</div>
                      <div className="mt-1 text-xs text-muted-foreground">{fmt(e.created_at)}</div>
                    </div>
                    {e.link ? (
                      <a className="text-sm underline whitespace-nowrap" href={e.link} target="_blank" rel="noreferrer">
                        Open
                      </a>
                    ) : null}
                  </div>
                ))}
                {!data?.events?.length && !loading ? (
                  <div className="py-6 text-sm text-muted-foreground">No events yet.</div>
                ) : null}
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
