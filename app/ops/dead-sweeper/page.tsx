"use client";

import { useEffect, useMemo, useState } from "react";
import { Loader2, Search } from "lucide-react";

type FeatureFinding = any;
type ApiFinding = any;

export default function DeadSweeperPage() {
  const [loading, setLoading] = useState(true);
  const [report, setReport] = useState<any>(null);
  const [q, setQ] = useState("");
  const [tab, setTab] = useState<"features" | "apis" | "unowned">("features");
  const [open, setOpen] = useState<Record<string, boolean>>({});
  const [onlyBroken, setOnlyBroken] = useState(false);

  useEffect(() => {
    fetch("/api/ops/dead-sweeper?days=30", { cache: "no-store" })
      .then(async (r) => {
        const text = await r.text();
        try {
          return JSON.parse(text);
        } catch {
          return { ok: false, error: text || `HTTP ${r.status}` };
        }
      })
      .then((d) => setReport(d))
      .finally(() => setLoading(false));
  }, []);

  const features: FeatureFinding[] = report?.features || [];
  const apis: ApiFinding[] = report?.apis || [];

  const filteredFeatures = useMemo(() => {
    const qq = q.trim().toLowerCase();
    const base = features.filter((f) => {
      if (!qq) return true;
      return (
        String(f.feature_id).toLowerCase().includes(qq) ||
        String(f.name).toLowerCase().includes(qq) ||
        String(f.group).toLowerCase().includes(qq) ||
        String(f.classification).toLowerCase().includes(qq)
      );
    });
    return onlyBroken ? base.filter((f) => f.classification === "BROKEN") : base;
  }, [features, q, onlyBroken]);

  const filteredApis = useMemo(() => {
    const qq = q.trim().toLowerCase();
    return apis.filter((a) => {
      if (!qq) return true;
      return String(a.api).toLowerCase().includes(qq) || String(a.classification).toLowerCase().includes(qq);
    });
  }, [apis, q]);

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-950 text-white flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-violet-500" />
      </div>
    );
  }

  if (!report?.ok) {
    return (
      <div className="min-h-screen bg-zinc-950 text-white p-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-xl font-semibold">Dead Sweeper</div>
          <div className="mt-2 text-rose-300">Failed to load: {report?.error || "unknown"}</div>
        </div>
      </div>
    );
  }

  const s = report.summary;

  return (
    <div className="min-h-screen bg-gradient-to-br from-zinc-950 via-zinc-900 to-zinc-950 text-white p-6">
      <div className="max-w-6xl mx-auto space-y-5">
        <div>
          <div className="text-3xl font-bold">Dead Sweeper</div>
          <div className="text-sm text-zinc-400">
            Generated {new Date(s.generated_at).toLocaleString()} • Lookback {s.lookback_days}d
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Card title="Features" value={s.totals.features} />
          <Card title="Used" value={s.totals.used} />
          <Card title="Dormant" value={s.totals.dormant} />
          <Card title="Broken" value={s.totals.broken} />
        </div>

        <div className="flex items-center gap-3">
          <div className="flex-1 bg-zinc-900/50 border border-zinc-800 rounded-xl p-3 flex items-center gap-3">
            <Search className="w-4 h-4 text-zinc-500" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search… (id, name, group, status)"
              className="flex-1 bg-transparent outline-none text-sm"
            />
          </div>

          <button
            onClick={() => setOnlyBroken((v) => !v)}
            className={`px-3 py-2 rounded-xl text-sm border ${
              onlyBroken ? "bg-rose-900/30 border-rose-700 text-rose-200" : "bg-zinc-900 border-zinc-800"
            }`}
          >
            {onlyBroken ? "Showing BROKEN" : "Filter BROKEN"}
          </button>

          <div className="flex gap-2">
            <button
              onClick={() => setTab("features")}
              className={`px-3 py-2 rounded-xl text-sm border ${
                tab === "features" ? "bg-zinc-800 border-zinc-700" : "bg-zinc-900 border-zinc-800"
              }`}
            >
              Features
            </button>
            <button
              onClick={() => setTab("apis")}
              className={`px-3 py-2 rounded-xl text-sm border ${
                tab === "apis" ? "bg-zinc-800 border-zinc-700" : "bg-zinc-900 border-zinc-800"
              }`}
            >
              APIs
            </button>
            <button
              onClick={() => setTab("unowned")}
              className={`px-3 py-2 rounded-xl text-sm border ${
                tab === "unowned" ? "bg-zinc-800 border-zinc-700" : "bg-zinc-900 border-zinc-800"
              }`}
            >
              Unowned
            </button>
          </div>
        </div>

        {tab === "features" ? (
          <div className="space-y-2">
            {filteredFeatures.length > 0 ? (
              filteredFeatures.map((f) => (
                <div key={f.feature_id} className="bg-zinc-900/40 border border-zinc-800 rounded-2xl p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="font-semibold">{f.name}</div>
                      <div className="text-xs text-zinc-500 mt-1">
                        {f.feature_id} • {f.group} • {f.status}
                      </div>
                    </div>
                    <div className="text-right">
                      <Badge text={f.classification} />
                      <div className="text-xs text-zinc-400 mt-1">
                        {f.page_views_30d} pv • {f.api_calls_30d} api • {f.gate_blocks_30d} blocks
                      </div>
                    </div>
                  </div>

                  {f.notes?.length > 0 && (
                    <ul className="mt-3 text-sm text-zinc-300 list-disc pl-5 space-y-1">
                      {f.notes.map((n: string, i: number) => (
                        <li key={i}>{n}</li>
                      ))}
                    </ul>
                  )}

                  <div className="mt-3 flex flex-wrap gap-2 text-xs">
                    <Pill label={`Severity: ${f.severity}`} />
                    <Pill label={`Action: ${f.recommended_action}`} />
                    <Pill label={`Observed APIs: ${f.observed_api_count}`} />
                    <Pill label={`Defined APIs: ${f.defined_api_count}`} />
                    <Pill label={`Missing refs: ${f.missing_api_calls}`} />
                    <Pill label={`Unowned calls: ${f.unowned_api_calls}`} />
                  </div>

                  {(f.missing_api_details?.length || f.unowned_call_details?.length) ? (
                    <div className="mt-3">
                      <div className="flex items-center gap-2">
                        <button
                          className="text-xs text-zinc-400 hover:text-zinc-200 underline"
                          onClick={() =>
                            setOpen((prev) => ({ ...prev, [f.feature_id]: !prev[f.feature_id] }))
                          }
                        >
                          {open[f.feature_id] ? "Hide details" : "Show details"}
                        </button>

                        <button
                          className="text-xs text-zinc-400 hover:text-zinc-200 underline"
                          onClick={() => {
                            const payload = {
                              feature_id: f.feature_id,
                              missing_api_details: f.missing_api_details || [],
                              unowned_call_details: f.unowned_call_details || [],
                            };
                            navigator.clipboard.writeText(JSON.stringify(payload, null, 2)).catch(() => {});
                          }}
                        >
                          Copy JSON
                        </button>
                      </div>

                      {open[f.feature_id] ? (
                        <div className="mt-2 space-y-3">
                          {f.missing_api_details?.length ? (
                            <div>
                              <div className="text-xs font-semibold text-rose-300">
                                Missing API refs ({f.missing_api_details.length})
                              </div>
                              <pre className="mt-1 text-xs whitespace-pre-wrap rounded-xl bg-zinc-950/60 border border-zinc-800 p-3 overflow-x-auto">
                                {JSON.stringify(f.missing_api_details, null, 2)}
                              </pre>
                            </div>
                          ) : null}

                          {f.unowned_call_details?.length ? (
                            <div>
                              <div className="text-xs font-semibold text-amber-300">
                                Unowned API calls ({f.unowned_call_details.length})
                              </div>
                              <pre className="mt-1 text-xs whitespace-pre-wrap rounded-xl bg-zinc-950/60 border border-zinc-800 p-3 overflow-x-auto">
                                {JSON.stringify(f.unowned_call_details, null, 2)}
                              </pre>
                            </div>
                          ) : null}
                        </div>
                      ) : null}
                    </div>
                  ) : null}
                </div>
              ))
            ) : (
              <div className="text-center text-zinc-500 py-12">No features match your search.</div>
            )}
          </div>
        ) : tab === "apis" ? (
          <div className="space-y-2">
            {filteredApis.length > 0 ? (
              filteredApis.map((a) => (
                <div key={a.api} className="bg-zinc-900/40 border border-zinc-800 rounded-2xl p-4">
                  <div className="flex items-center justify-between gap-4">
                    <div className="font-mono text-sm">{a.api}</div>
                    <div className="text-right">
                      <Badge text={a.classification} />
                      <div className="text-xs text-zinc-400 mt-1">{a.calls_30d} calls (30d)</div>
                    </div>
                  </div>
                  {a.notes?.length > 0 && <div className="mt-2 text-sm text-zinc-300">{a.notes[0]}</div>}
                </div>
              ))
            ) : (
              <div className="text-center text-zinc-500 py-12">No APIs match your search.</div>
            )}
          </div>
        ) : tab === "unowned" ? (
          <div className="space-y-3">
            {Object.keys(report?.unownedAttribution || {}).length === 0 ? (
              <div className="text-center text-zinc-500 py-12">No unowned API calls to attribute.</div>
            ) : (
              Object.entries(report?.unownedAttribution || {}).map(([fid, items]: any) => (
                <div key={fid} className="bg-zinc-900/40 border border-zinc-800 rounded-2xl p-4">
                  <div className="font-semibold">{fid}</div>
                  <div className="mt-2 space-y-1">
                    {items
                      .sort((a: any, b: any) => b.calls_30d - a.calls_30d)
                      .slice(0, 20)
                      .map((x: any) => (
                        <div key={x.api} className="flex items-center justify-between text-sm text-zinc-300">
                          <span className="font-mono">{x.api}</span>
                          <span className="text-zinc-400">{x.calls_30d} calls</span>
                        </div>
                      ))}
                  </div>
                </div>
              ))
            )}
          </div>
        ) : null}
      </div>
    </div>
  );
}

function Card({ title, value }: { title: string; value: any }) {
  return (
    <div className="bg-zinc-900/40 border border-zinc-800 rounded-2xl p-4">
      <div className="text-xs text-zinc-500">{title}</div>
      <div className="text-2xl font-bold mt-1">{value}</div>
    </div>
  );
}

function Badge({ text }: { text: string }) {
  const t = String(text || "").toUpperCase();
  const colors: Record<string, string> = {
    USED: "bg-emerald-900/50 text-emerald-300 border-emerald-800",
    DORMANT: "bg-yellow-900/50 text-yellow-300 border-yellow-800",
    BROKEN: "bg-rose-900/50 text-rose-300 border-rose-800",
    HIDDEN: "bg-zinc-800 text-zinc-300 border-zinc-700",
    ORPHAN: "bg-amber-900/50 text-amber-300 border-amber-800",
  };
  const color = colors[t] || "bg-zinc-800 text-zinc-300 border-zinc-700";
  return (
    <span className={`inline-flex items-center rounded-full border px-2 py-1 text-[10px] ${color}`}>{t}</span>
  );
}

function Pill({ label }: { label: string }) {
  return <span className="rounded-full bg-zinc-800/60 px-2 py-1 text-zinc-300">{label}</span>;
}

