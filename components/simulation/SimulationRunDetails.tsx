// components/simulation/SimulationRunDetails.tsx
"use client";

import React, { useEffect, useMemo, useState } from "react";
import {
  fetchSimulationRun,
  rerunSimulationRun,
  downloadJson,
  type SimulationRunDetail,
} from "@/lib/simulation/client/runsApi";
import { extractDrillSteps, buildDrillSummary, type DrillStep } from "@/lib/simulation/client/drilldown";
import {
  createFixPlanForStep,
  listFixPlans,
  getFixPlan,
  type FixPlanMeta,
  type FixPlanFull,
} from "@/lib/simulation/client/fixPlansApi";

function pill(cls: string) {
  return `inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${cls}`;
}

function statusPill(status: string) {
  if (status === "finished") return pill("border-emerald-500/50 bg-emerald-500/10 text-emerald-400");
  if (status === "failed") return pill("border-red-500/50 bg-red-500/10 text-red-400");
  if (status === "started") return pill("border-amber-500/50 bg-amber-500/10 text-amber-400");
  return pill("border-zinc-600 bg-zinc-800 text-zinc-300");
}

function stepPill(sev: DrillStep["severity"]) {
  if (sev === "ok") return pill("border-emerald-500/50 bg-emerald-500/10 text-emerald-400");
  if (sev === "warn") return pill("border-amber-500/50 bg-amber-500/10 text-amber-400");
  return pill("border-red-500/50 bg-red-500/10 text-red-400");
}

export default function SimulationRunDetails(props: {
  runId: string | null;
  onClose: () => void;
}) {
  const { runId, onClose } = props;

  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [run, setRun] = useState<SimulationRunDetail | null>(null);

  const [filterFailuresOnly, setFilterFailuresOnly] = useState(false);
  const [selectedStepId, setSelectedStepId] = useState<string | null>(null);

  const [rerunBusy, setRerunBusy] = useState(false);
  const [rerunErr, setRerunErr] = useState<string | null>(null);
  const [rerunOut, setRerunOut] = useState<any>(null);

  // Fix plans
  const [plansBusy, setPlansBusy] = useState(false);
  const [plansErr, setPlansErr] = useState<string | null>(null);
  const [plans, setPlans] = useState<FixPlanMeta[]>([]);
  const [activePlanId, setActivePlanId] = useState<string | null>(null);

  const [genBusy, setGenBusy] = useState(false);
  const [genErr, setGenErr] = useState<string | null>(null);
  const [activePlan, setActivePlan] = useState<FixPlanFull | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      if (!runId) {
        setRun(null);
        setErr(null);
        return;
      }
      setBusy(true);
      setErr(null);
      setRun(null);
      setSelectedStepId(null);
      setRerunErr(null);
      setRerunOut(null);

      // reset plans
      setPlans([]);
      setPlansErr(null);
      setActivePlanId(null);
      setActivePlan(null);
      setGenErr(null);

      try {
        const detail = await fetchSimulationRun(runId);
        if (!cancelled) setRun(detail);
      } catch (e: any) {
        if (!cancelled) setErr(e?.message || "Failed to load run");
      } finally {
        if (!cancelled) setBusy(false);
      }

      // load plan metadata list (best-effort)
      try {
        setPlansBusy(true);
        const rows = await listFixPlans(runId, 10);
        if (!cancelled) setPlans(rows);
      } catch (e: any) {
        if (!cancelled) setPlansErr(e?.message || "Failed to load fix plans");
      } finally {
        if (!cancelled) setPlansBusy(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [runId]);

  const steps = useMemo(() => extractDrillSteps(run?.result), [run?.result]);
  const summary = useMemo(() => buildDrillSummary(steps), [steps]);

  const visibleSteps = useMemo(() => {
    if (!filterFailuresOnly) return steps;
    return steps.filter((s) => !s.ok || s.severity === "error");
  }, [steps, filterFailuresOnly]);

  const selectedStep = useMemo(() => {
    if (!selectedStepId) return null;
    return steps.find((s) => s.id === selectedStepId) || null;
  }, [steps, selectedStepId]);

  const selectedStepIsFailed = !!selectedStep && (!selectedStep.ok || selectedStep.severity === "error");

  async function handleRerun() {
    if (!runId) return;

    setRerunBusy(true);
    setRerunErr(null);
    setRerunOut(null);
    try {
      const out = await rerunSimulationRun(runId);
      setRerunOut(out);
    } catch (e: any) {
      setRerunErr(e?.message || "Rerun failed");
    } finally {
      setRerunBusy(false);
    }
  }

  function handleExport() {
    if (!run) return;

    downloadJson(`simulation-run-${run.request_id}.json`, {
      run,
      drilldown: {
        summary,
        steps,
      },
      fixplans: plans,
      active_fixplan: activePlan,
    });
  }

  async function loadPlan(planId: string) {
    setGenErr(null);
    setActivePlan(null);
    setActivePlanId(planId);
    try {
      const full = await getFixPlan(planId);
      setActivePlan(full);
    } catch (e: any) {
      setGenErr(e?.message || "Failed to load plan");
    }
  }

  async function generatePlanForSelectedStep() {
    if (!runId || !selectedStep) return;

    setGenBusy(true);
    setGenErr(null);
    setActivePlan(null);

    try {
      const created = await createFixPlanForStep(runId, {
        stepId: selectedStep.id,
        stepTitle: selectedStep.title,
        step: {
          id: selectedStep.id,
          title: selectedStep.title,
          ok: selectedStep.ok,
          severity: selectedStep.severity,
          detail: selectedStep.detail,
          pathId: selectedStep.pathId,
          data: selectedStep.data,
        },
      });

      // refresh list + open plan (best effort)
      const rows = await listFixPlans(runId, 10);
      setPlans(rows);

      // If we have planId, load it via GET endpoint
      if (created.planId) {
        await loadPlan(created.planId);
      }
    } catch (e: any) {
      setGenErr(e?.message || "Failed to generate fix plan");
    } finally {
      setGenBusy(false);
    }
  }

  if (!runId) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/30 flex items-end md:items-center justify-center p-4">
      <div className="w-full max-w-6xl rounded-xl border border-zinc-700 bg-zinc-900 shadow-lg">
        <div className="flex items-center justify-between border-b border-zinc-700 p-4 gap-3">
          <div className="space-y-1 min-w-0">
            <div className="text-sm font-medium text-white">Run Drilldown</div>
            <div className="text-xs text-zinc-400 font-mono truncate">
              {run?.request_id || "…"}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              className="rounded-md border border-zinc-700 bg-zinc-800 px-3 py-1.5 text-sm text-white hover:bg-zinc-700 disabled:opacity-50"
              onClick={handleExport}
              disabled={!run}
            >
              Export JSON
            </button>
            <button
              className="rounded-md border border-purple-600 bg-purple-600 px-3 py-1.5 text-sm text-white hover:bg-purple-700 disabled:opacity-50"
              onClick={handleRerun}
              disabled={!run || rerunBusy}
            >
              {rerunBusy ? "Re-running..." : "Re-run"}
            </button>
            <button className="rounded-md border border-zinc-700 bg-zinc-800 px-3 py-1.5 text-sm text-white hover:bg-zinc-700" onClick={onClose}>
              Close
            </button>
          </div>
        </div>

        <div className="p-4 space-y-4 max-h-[78vh] overflow-auto">
          {busy ? <div className="text-sm text-zinc-400">Loading…</div> : null}
          {err ? <div className="text-sm text-red-400">{err}</div> : null}

          {run ? (
            <>
              {/* Summary */}
              <div className="grid gap-3 md:grid-cols-4">
                <div className="rounded-lg border border-zinc-700 p-3">
                  <div className="text-xs text-zinc-400">Status</div>
                  <div className="mt-1">
                    <span className={statusPill(run.status)}>{run.status}</span>
                  </div>
                </div>
                <div className="rounded-lg border border-zinc-700 p-3">
                  <div className="text-xs text-zinc-400">Steps</div>
                  <div className="text-sm font-medium text-white">
                    {summary.total} (ok {summary.ok}, err {summary.error})
                  </div>
                </div>
                <div className="rounded-lg border border-zinc-700 p-3">
                  <div className="text-xs text-zinc-400">Duration</div>
                  <div className="text-sm font-medium text-white">{run.duration_ms ? `${(run.duration_ms / 1000).toFixed(2)}s` : "—"}</div>
                </div>
                <div className="rounded-lg border border-zinc-700 p-3">
                  <div className="text-xs text-zinc-400">Route</div>
                  <div className="text-sm font-medium text-white">{run.route}</div>
                </div>
              </div>

              {/* Top error */}
              {(run.error || summary.topError) ? (
                <div className="rounded-lg border border-red-500/50 bg-red-500/10 p-3">
                  <div className="text-xs text-red-400 font-medium">Top Error</div>
                  <div className="text-sm text-red-400 whitespace-pre-wrap">
                    {run.error || summary.topError}
                  </div>
                </div>
              ) : null}

              {/* Drilldown */}
              <div className="rounded-lg border border-zinc-700 p-3 space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="text-sm font-medium text-white">Step Drilldown</div>
                    <div className="text-xs text-zinc-400">
                      Select a failed step → generate fix plan → re-run
                    </div>
                  </div>
                  <label className="flex items-center gap-2 text-sm text-white">
                    <input
                      type="checkbox"
                      checked={filterFailuresOnly}
                      onChange={(e) => setFilterFailuresOnly(e.target.checked)}
                      className="rounded border-zinc-600 bg-zinc-800 text-purple-600"
                    />
                    Failures only
                  </label>
                </div>

                <div className="grid gap-3 lg:grid-cols-2">
                  {/* Steps list */}
                  <div className="rounded-lg border border-zinc-700 p-2 max-h-[320px] overflow-auto">
                    {visibleSteps.length === 0 ? (
                      <div className="text-sm text-zinc-400 p-2">No steps.</div>
                    ) : (
                      <div className="space-y-1">
                        {visibleSteps.map((s) => (
                          <button
                            key={s.id}
                            className={[
                              "w-full text-left rounded-md border border-zinc-700 px-3 py-2 hover:bg-zinc-800/50 transition-colors",
                              selectedStepId === s.id ? "bg-zinc-800/50 border-purple-500/50" : "",
                            ].join(" ")}
                            onClick={() => setSelectedStepId(s.id)}
                          >
                            <div className="flex items-center justify-between gap-2">
                              <div className="min-w-0">
                                <div className="text-sm font-medium text-white truncate">{s.title}</div>
                                <div className="text-xs text-zinc-400 truncate">
                                  {s.pathId ? `path: ${s.pathId}` : ""}
                                  {s.detail ? (s.pathId ? " • " : "") + s.detail : ""}
                                </div>
                              </div>
                              <div className="flex items-center gap-2 shrink-0">
                                <span className={stepPill(s.severity)}>{s.ok ? "ok" : "error"}</span>
                                {typeof s.duration_ms === "number" ? (
                                  <span className="text-xs text-zinc-400">{s.duration_ms}ms</span>
                                ) : null}
                              </div>
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Step detail + Fix Plan Controls */}
                  <div className="rounded-lg border border-zinc-700 p-3 max-h-[320px] overflow-auto space-y-3">
                    {!selectedStep ? (
                      <div className="text-sm text-zinc-400">Select a step to view details.</div>
                    ) : (
                      <>
                        <div className="flex items-center justify-between gap-2">
                          <div className="text-sm font-medium text-white">{selectedStep.title}</div>
                          <span className={stepPill(selectedStep.severity)}>
                            {selectedStep.ok ? "ok" : "error"}
                          </span>
                        </div>

                        {selectedStep.detail ? (
                          <div className="text-xs text-zinc-400 whitespace-pre-wrap">
                            {selectedStep.detail}
                          </div>
                        ) : null}

                        <div className="flex items-center gap-2">
                          <button
                            className="rounded-md border border-purple-600 bg-purple-600 px-3 py-1.5 text-sm text-white hover:bg-purple-700 disabled:opacity-50"
                            onClick={generatePlanForSelectedStep}
                            disabled={!selectedStepIsFailed || genBusy}
                            title={!selectedStepIsFailed ? "Select a failed step" : "Generate a server-side fix plan"}
                          >
                            {genBusy ? "Generating..." : "Generate Fix Plan"}
                          </button>

                          {genErr ? <div className="text-sm text-red-400">{genErr}</div> : null}
                        </div>

                        <div>
                          <div className="text-xs text-zinc-400 mb-1">Step data</div>
                          <pre className="text-xs whitespace-pre-wrap overflow-auto text-zinc-300">
                            {JSON.stringify(selectedStep.data ?? {}, null, 2)}
                          </pre>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* Input + Result (raw) */}
              <div className="grid gap-3 lg:grid-cols-2">
                <div className="rounded-lg border border-zinc-700 p-3">
                  <div className="text-xs text-zinc-400 mb-2">Input (raw)</div>
                  <pre className="text-xs whitespace-pre-wrap overflow-auto text-zinc-300">
                    {JSON.stringify(run.input ?? {}, null, 2)}
                  </pre>
                </div>
                <div className="rounded-lg border border-zinc-700 p-3">
                  <div className="text-xs text-zinc-400 mb-2">Result (raw)</div>
                  <pre className="text-xs whitespace-pre-wrap overflow-auto text-zinc-300">
                    {JSON.stringify(run.result ?? {}, null, 2)}
                  </pre>
                </div>
              </div>

              {/* Fix Plans Viewer */}
              <div className="rounded-lg border border-zinc-700 p-4 space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="text-sm font-medium text-white">Fix Plans</div>
                    <div className="text-xs text-zinc-400">
                      Generated plans are persisted and tied to run + step
                    </div>
                  </div>
                  <button
                    className="rounded-md border border-zinc-700 bg-zinc-800 px-3 py-1.5 text-sm text-white hover:bg-zinc-700 disabled:opacity-50"
                    onClick={async () => {
                      if (!runId) return;
                      setPlansBusy(true);
                      setPlansErr(null);
                      try {
                        const rows = await listFixPlans(runId, 10);
                        setPlans(rows);
                      } catch (e: any) {
                        setPlansErr(e?.message || "Failed to refresh");
                      } finally {
                        setPlansBusy(false);
                      }
                    }}
                    disabled={plansBusy}
                  >
                    {plansBusy ? "Refreshing..." : "Refresh"}
                  </button>
                </div>

                {plansErr ? <div className="text-sm text-red-400">{plansErr}</div> : null}

                <div className="grid gap-3 lg:grid-cols-2">
                  <div className="rounded-lg border border-zinc-700 p-2 max-h-[220px] overflow-auto">
                    {plans.length === 0 ? (
                      <div className="text-sm text-zinc-400 p-2">No fix plans yet.</div>
                    ) : (
                      <div className="space-y-1">
                        {plans.map((p) => (
                          <button
                            key={p.id}
                            className={[
                              "w-full text-left rounded-md border border-zinc-700 px-3 py-2 hover:bg-zinc-800/50 transition-colors",
                              activePlanId === p.id ? "bg-zinc-800/50 border-purple-500/50" : "",
                            ].join(" ")}
                            onClick={() => loadPlan(p.id)}
                            title="Load fix plan"
                          >
                            <div className="flex items-center justify-between gap-2">
                              <div className="min-w-0">
                                <div className="text-sm font-medium text-white truncate">
                                  {p.step_title || p.step_id}
                                </div>
                                <div className="text-xs text-zinc-400 truncate font-mono">
                                  {p.request_id}
                                </div>
                              </div>
                              <span className={statusPill(p.status)}>{p.status}</span>
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="rounded-lg border border-zinc-700 p-3 max-h-[220px] overflow-auto">
                    {!activePlan ? (
                      <div className="text-sm text-zinc-400">
                        Select a fix plan to view details.
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <div className="flex items-center justify-between gap-2">
                          <div className="text-sm font-medium text-white">Plan</div>
                          <button
                            className="rounded-md border border-zinc-700 bg-zinc-800 px-3 py-1.5 text-sm text-white hover:bg-zinc-700"
                            onClick={() =>
                              downloadJson(`fixplan-${activePlan.request_id}.json`, activePlan)
                            }
                          >
                            Export Plan JSON
                          </button>
                        </div>

                        {activePlan.error ? (
                          <div className="text-sm text-red-400 whitespace-pre-wrap">
                            {activePlan.error}
                          </div>
                        ) : null}

                        <div className="rounded-md border border-zinc-700 p-2 bg-zinc-800/20">
                          <pre className="text-xs whitespace-pre-wrap overflow-auto text-zinc-300">
                            {activePlan.plan_markdown || "(no markdown)"}
                          </pre>
                        </div>

                        {activePlan.patch_json ? (
                          <>
                            <div>
                              <div className="text-xs text-zinc-400 mb-1">Patch JSON</div>
                              <pre className="text-xs whitespace-pre-wrap overflow-auto text-zinc-300">
                                {JSON.stringify(activePlan.patch_json, null, 2)}
                              </pre>
                            </div>
                            <div className="rounded-md border border-zinc-700 p-3 space-y-2 bg-zinc-800/20">
                              <div className="text-sm font-medium text-white">Apply Patch (Safe)</div>
                              <ol className="list-decimal pl-5 text-sm space-y-1 text-zinc-300">
                                <li>Click <span className="font-medium">Export Plan JSON</span> (above).</li>
                                <li>Run a dry-run:</li>
                              </ol>
                              <pre className="text-xs overflow-auto rounded-md border border-zinc-700 p-2 bg-zinc-900 text-zinc-300">
                                {`npm run fixplans:apply -- path/to/fixplan-${activePlan.request_id}.json --dry-run`}
                              </pre>
                              <ol className="list-decimal pl-5 text-sm space-y-1 text-zinc-300" start={3}>
                                <li>If it looks correct, apply for real:</li>
                              </ol>
                              <pre className="text-xs overflow-auto rounded-md border border-zinc-700 p-2 bg-zinc-900 text-zinc-300">
                                {`npm run fixplans:apply -- path/to/fixplan-${activePlan.request_id}.json`}
                              </pre>
                              <div className="text-xs text-zinc-400">
                                Guardrails: allowlisted paths, size limits, backups (*.bak). Use <span className="font-mono">--allow-delete</span> for delete ops, <span className="font-mono">--force</span> to bypass hash checks.
                              </div>
                            </div>
                          </>
                        ) : null}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Rerun output */}
              {rerunErr ? <div className="text-sm text-red-400">{rerunErr}</div> : null}
              {rerunOut ? (
                <div className="rounded-lg border border-zinc-700 p-3">
                  <div className="text-sm font-medium text-white mb-2">Re-run Output</div>
                  <pre className="text-xs whitespace-pre-wrap overflow-auto text-zinc-300">
                    {JSON.stringify(rerunOut, null, 2)}
                  </pre>
                </div>
              ) : null}
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
}
