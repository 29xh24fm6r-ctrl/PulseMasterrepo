// app/simulation/paths/page.tsx
"use client";

import React, { useEffect, useMemo, useState } from "react";
import SimulationRunsTable from "@/components/simulation/SimulationRunsTable";
import SimulationRunDetails from "@/components/simulation/SimulationRunDetails";
import { fetchSimulationRuns, type SimulationRunRow } from "@/lib/simulation/client/runsApi";

type Scenario = {
  id: string;
  title: string;
  mode: "single" | "all";
  dealId?: string | null;
  pathIds?: string[] | null;
  input?: Record<string, any>;
};

type RunResponse =
  | { ok: true; result: any; request_id?: string }
  | { ok: false; error: string };

async function fetchScenarios(): Promise<Scenario[]> {
  const res = await fetch("/api/simulation/paths/scenarios", {
    method: "GET",
    headers: { Accept: "application/json" },
    cache: "no-store",
  });
  const json = (await res.json().catch(() => null)) as any;
  if (!json?.ok) throw new Error(json?.error || "Failed to load scenarios");
  return (json.scenarios || []) as Scenario[];
}

export default function SimulationPathsPage() {
  // scenarios
  const [scenarios, setScenarios] = useState<Scenario[]>([]);
  const [scenarioBusy, setScenarioBusy] = useState(false);
  const [scenarioErr, setScenarioErr] = useState<string | null>(null);
  const [selectedScenarioId, setSelectedScenarioId] = useState<string>("");

  // run
  const [runBusy, setRunBusy] = useState(false);
  const [runErr, setRunErr] = useState<string | null>(null);
  const [output, setOutput] = useState<any>(null);

  // runs history
  const [runs, setRuns] = useState<SimulationRunRow[]>([]);
  const [runsBusy, setRunsBusy] = useState(false);
  const [runsErr, setRunsErr] = useState<string | null>(null);

  // detail modal
  const [activeRunId, setActiveRunId] = useState<string | null>(null);

  const selectedScenario = useMemo(() => {
    return scenarios.find((s) => s.id === selectedScenarioId) || null;
  }, [scenarios, selectedScenarioId]);

  async function loadScenarios() {
    setScenarioBusy(true);
    setScenarioErr(null);
    try {
      const data = await fetchScenarios();
      setScenarios(data);
      if (!selectedScenarioId && data.length) setSelectedScenarioId(data[0].id);
    } catch (e: any) {
      setScenarioErr(e?.message || "Failed to load scenarios");
    } finally {
      setScenarioBusy(false);
    }
  }

  async function loadRuns() {
    setRunsBusy(true);
    setRunsErr(null);
    try {
      const data = await fetchSimulationRuns(20);
      setRuns(data);
    } catch (e: any) {
      setRunsErr(e?.message || "Failed to load runs");
    } finally {
      setRunsBusy(false);
    }
  }

  async function runScenario() {
    if (!selectedScenario) return;

    setRunBusy(true);
    setRunErr(null);
    setOutput(null);

    try {
      const payload = {
        scenarioId: selectedScenario.id,
      };

      const res = await fetch("/api/simulation/paths/run", {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify(payload),
      });

      const json = (await res.json().catch(() => null)) as RunResponse | null;
      if (!json) throw new Error("Bad JSON response");
      if (!json.ok) throw new Error(json.error || "Simulation run failed");

      setOutput(json.result ?? null);

      // refresh history after successful run
      await loadRuns();
    } catch (e: any) {
      setRunErr(e?.message || "Simulation run failed");
      await loadRuns(); // still refresh; failures are valuable
    } finally {
      setRunBusy(false);
    }
  }

  // initial load
  useEffect(() => {
    loadScenarios();
    loadRuns();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // auto-refresh runs every 15s (lightweight)
  useEffect(() => {
    const t = setInterval(() => {
      loadRuns();
    }, 15000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-zinc-950 via-zinc-900 to-zinc-950 text-white p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold">Simulation Control Plane</h1>
          <p className="text-sm text-zinc-400">
            Runs are server-only (AGI-safe), fully audited, and observable via request IDs.
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          {/* Left: Scenario + Run */}
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4 space-y-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-sm font-medium text-white">Scenarios</div>
                <div className="text-xs text-zinc-400">
                  Pick a scenario → run → see output + audit
                </div>
              </div>
              <button
                className="rounded-md border border-zinc-700 bg-zinc-800 px-3 py-1.5 text-sm text-white hover:bg-zinc-700 disabled:opacity-50"
                onClick={loadScenarios}
                disabled={scenarioBusy}
              >
                {scenarioBusy ? "Loading..." : "Reload"}
              </button>
            </div>

            {scenarioErr ? <div className="text-sm text-red-400">{scenarioErr}</div> : null}

            <label className="space-y-1 block">
              <div className="text-sm font-medium text-white">Select scenario</div>
              <select
                className="w-full rounded-md border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-white"
                value={selectedScenarioId}
                onChange={(e) => setSelectedScenarioId(e.target.value)}
                disabled={scenarioBusy || scenarios.length === 0}
              >
                {scenarios.length === 0 ? (
                  <option value="">No scenarios</option>
                ) : (
                  scenarios.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.title} ({s.mode})
                    </option>
                  ))
                )}
              </select>
            </label>

            {selectedScenario ? (
              <div className="rounded-lg border border-zinc-700 bg-zinc-800/50 p-3 space-y-2">
                <div className="text-xs text-zinc-400">Scenario preview</div>
                <div className="grid gap-2 md:grid-cols-2 text-sm">
                  <div>
                    <div className="text-xs text-zinc-400">ID</div>
                    <div className="font-mono text-xs text-white">{selectedScenario.id}</div>
                  </div>
                  <div>
                    <div className="text-xs text-zinc-400">Mode</div>
                    <div className="text-white">{selectedScenario.mode}</div>
                  </div>
                  <div>
                    <div className="text-xs text-zinc-400">Deal</div>
                    <div className="font-mono text-xs text-white">{selectedScenario.dealId || "—"}</div>
                  </div>
                  <div>
                    <div className="text-xs text-zinc-400">Paths</div>
                    <div className="font-mono text-xs text-white">
                      {(selectedScenario.pathIds || []).join(", ") || "—"}
                    </div>
                  </div>
                </div>
              </div>
            ) : null}

            <div className="flex items-center gap-3">
              <button
                className="rounded-md border border-purple-600 bg-purple-600 px-4 py-2 text-sm text-white hover:bg-purple-700 disabled:opacity-50"
                onClick={runScenario}
                disabled={runBusy || !selectedScenario}
              >
                {runBusy ? "Running..." : "Run Scenario"}
              </button>
              {runErr ? <div className="text-sm text-red-400">{runErr}</div> : null}
            </div>

            <div className="rounded-lg border border-zinc-700 bg-zinc-800/50 p-3">
              <div className="text-sm font-medium text-white mb-2">Output</div>
              {!output ? (
                <div className="text-sm text-zinc-400">No output yet.</div>
              ) : (
                <pre className="overflow-auto text-xs whitespace-pre-wrap text-zinc-300">
                  {JSON.stringify(output, null, 2)}
                </pre>
              )}
            </div>
          </div>

          {/* Right: History */}
          <div className="space-y-6">
            <SimulationRunsTable
              runs={runs}
              busy={runsBusy}
              error={runsErr}
              onRefresh={loadRuns}
              onSelectRun={(id) => setActiveRunId(id)}
            />
          </div>
        </div>

        <SimulationRunDetails runId={activeRunId} onClose={() => setActiveRunId(null)} />
      </div>
    </div>
  );
}
