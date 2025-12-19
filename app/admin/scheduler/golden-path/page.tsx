"use client";

import { useState } from "react";
import { CheckCircle2, XCircle, Loader2, Play, RefreshCw } from "lucide-react";
import { adminPost } from "@/lib/api/adminFetch";

interface ScenarioResult {
  scenario: string;
  ok: boolean;
  steps: Record<string, any>;
  error?: string;
}

export default function GoldenPathPage() {
  const [running, setRunning] = useState(false);
  const [selectedScenario, setSelectedScenario] = useState<"all" | "success" | "retry" | "sla">("all");
  const [results, setResults] = useState<ScenarioResult[]>([]);

  async function runGoldenPath(scenario: "all" | "success" | "retry" | "sla") {
    setRunning(true);
    setSelectedScenario(scenario);
    setResults([]);

    try {
      const data = await adminPost<{
        ok: boolean;
        scenario: string;
        results: ScenarioResult[];
        error?: string;
      }>("/api/admin/scheduler/golden-path", {
        scenario,
      });

      if (!data.ok) {
        setResults([
          {
            scenario: scenario === "all" ? "error" : scenario,
            ok: false,
            steps: {},
            error: data.error || "Test failed",
          },
        ]);
        setRunning(false);
        return;
      }

      setResults(data.results || []);
    } catch (err: any) {
      setResults([
        {
          scenario: scenario === "all" ? "error" : scenario,
          ok: false,
          steps: {},
          error: err instanceof Error ? err.message : String(err),
        },
      ]);
    } finally {
      setRunning(false);
    }
  }

  function statusIcon(ok: boolean) {
    if (ok) return <CheckCircle2 className="w-5 h-5 text-emerald-400" />;
    return <XCircle className="w-5 h-5 text-red-400" />;
  }

  const allPassed = results.length > 0 && results.every((r) => r.ok);
  const anyFailed = results.some((r) => !r.ok);

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Job Queue Golden Path Test</h1>
          <p className="text-sm text-zinc-400 mt-1">
            Regression harness for job lifecycle: success, retry (refund + backoff), and SLA escalation
          </p>
        </div>

        {/* Scenario Buttons */}
        <div className="flex gap-3 flex-wrap">
          <button
            onClick={() => runGoldenPath("all")}
            disabled={running}
            className="inline-flex items-center gap-2 px-4 py-2 bg-violet-600 hover:bg-violet-700 disabled:bg-zinc-800 text-white rounded-lg transition-colors"
          >
            {running && selectedScenario === "all" ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Play className="w-4 h-4" />
            )}
            Run All Scenarios
          </button>
          <button
            onClick={() => runGoldenPath("success")}
            disabled={running}
            className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-zinc-800 text-white rounded-lg transition-colors"
          >
            {running && selectedScenario === "success" ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Play className="w-4 h-4" />
            )}
            Success Path
          </button>
          <button
            onClick={() => runGoldenPath("retry")}
            disabled={running}
            className="inline-flex items-center gap-2 px-4 py-2 bg-yellow-600 hover:bg-yellow-700 disabled:bg-zinc-800 text-white rounded-lg transition-colors"
          >
            {running && selectedScenario === "retry" ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <RefreshCw className="w-4 h-4" />
            )}
            Retry Path (Refund + Backoff)
          </button>
          <button
            onClick={() => runGoldenPath("sla")}
            disabled={running}
            className="inline-flex items-center gap-2 px-4 py-2 bg-orange-600 hover:bg-orange-700 disabled:bg-zinc-800 text-white rounded-lg transition-colors"
          >
            {running && selectedScenario === "sla" ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Play className="w-4 h-4" />
            )}
            SLA Escalation
          </button>
        </div>

        {/* Results Summary */}
        {results.length > 0 && (
          <div
            className={`rounded-lg border p-4 ${
              allPassed ? "border-emerald-600 bg-emerald-900/20" : "border-red-600 bg-red-900/20"
            }`}
          >
            <div className="flex items-center gap-2">
              {allPassed ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-400" />
              ) : (
                <XCircle className="w-5 h-5 text-red-400" />
              )}
              <span className="font-semibold">
                {allPassed ? "All scenarios passed" : `${results.filter((r) => !r.ok).length} scenario(s) failed`}
              </span>
            </div>
          </div>
        )}

        {/* Detailed Results */}
        {results.map((result, idx) => (
          <div key={idx} className="bg-zinc-900 border border-zinc-800 rounded-lg p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {statusIcon(result.ok)}
                <div>
                  <h3 className="text-white font-medium text-lg">
                    {result.scenario === "success"
                      ? "Success Path"
                      : result.scenario === "retry"
                      ? "Retry Path (Refund + Backoff)"
                      : result.scenario === "sla"
                      ? "SLA Escalation Path"
                      : result.scenario}
                  </h3>
                  <p className="text-sm text-zinc-400">
                    {result.scenario === "success"
                      ? "enqueue → lease → complete success → results row exists"
                      : result.scenario === "retry"
                      ? "enqueue → lease → complete retryable failure → verify refund + requeue with backoff"
                      : result.scenario === "sla"
                      ? "enqueue with low SLA → run health tick → verify escalation decision logged"
                      : ""}
                  </p>
                </div>
              </div>
              <span className={`text-xs px-3 py-1 rounded-full ${result.ok ? "bg-emerald-900/50 text-emerald-300" : "bg-red-900/50 text-red-300"}`}>
                {result.ok ? "PASS" : "FAIL"}
              </span>
            </div>

            {result.error && (
              <div className="rounded-lg border border-red-600 bg-red-900/20 p-3">
                <p className="text-sm text-red-300">{result.error}</p>
              </div>
            )}

            {/* Steps */}
            <div className="space-y-2">
              {Object.entries(result.steps).map(([stepName, stepData]: [string, any]) => (
                <div key={stepName} className="flex items-start gap-3 p-3 bg-zinc-800/50 rounded-lg">
                  {stepData.ok !== false ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 mt-0.5 flex-shrink-0" />
                  ) : (
                    <XCircle className="w-4 h-4 text-red-400 mt-0.5 flex-shrink-0" />
                  )}
                  <div className="flex-1">
                    <div className="text-sm font-medium text-white">{stepName}</div>
                    {stepData.note && <div className="text-xs text-zinc-400 mt-1">{stepData.note}</div>}
                    {stepData && typeof stepData === "object" && Object.keys(stepData).length > 1 && (
                      <pre className="mt-2 p-2 bg-zinc-950 text-xs text-zinc-300 rounded overflow-auto">
                        {JSON.stringify(stepData, null, 2)}
                      </pre>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}

        {/* Documentation */}
        <div className="text-sm text-zinc-500 space-y-2">
          <p className="font-medium text-zinc-400">What each scenario tests:</p>
          <ul className="list-disc list-inside space-y-1 ml-4">
            <li>
              <strong>Success Path:</strong> Basic job lifecycle (enqueue → lease → complete → verify status)
            </li>
            <li>
              <strong>Retry Path:</strong> Retryable failures trigger refund in credits ledger and job requeue with
              backoff delay
            </li>
            <li>
              <strong>SLA Escalation:</strong> Jobs nearing SLA breach get priority boost and/or lane upgrade, with
              decision logged
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}
