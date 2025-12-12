// Autopilot Command Center
// app/autopilot/command-center/page.tsx

"use client";

import { useState, useEffect } from "react";
import {
  Zap,
  CheckCircle2,
  X,
  Play,
  Clock,
  AlertTriangle,
  TrendingUp,
} from "lucide-react";
import { AutopilotAction } from "@/lib/autopilot/types";

export default function AutopilotCommandCenterPage() {
  const [actions, setActions] = useState<AutopilotAction[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>("all");
  const [lastRun, setLastRun] = useState<any>(null);

  useEffect(() => {
    loadActions();
    loadLastRun();
  }, [filter]);

  async function loadActions() {
    try {
      const params = filter !== "all" ? `?status=${filter}` : "";
      const res = await fetch(`/api/autopilot/actions${params}`);
      const json = await res.json();
      if (res.ok) {
        setActions(json);
      }
    } catch (err) {
      console.error("Failed to load actions:", err);
    } finally {
      setLoading(false);
    }
  }

  async function loadLastRun() {
    try {
      // This would need a separate endpoint, but for now we'll skip it
    } catch (err) {
      console.error("Failed to load last run:", err);
    }
  }

  async function approveAction(actionId: string) {
    try {
      const res = await fetch(`/api/autopilot/actions/${actionId}/approve`, {
        method: "POST",
      });
      if (res.ok) {
        await loadActions();
      }
    } catch (err) {
      console.error("Failed to approve action:", err);
    }
  }

  async function executeAction(actionId: string) {
    try {
      const res = await fetch(`/api/autopilot/actions/${actionId}/execute`, {
        method: "POST",
      });
      if (res.ok) {
        await loadActions();
      }
    } catch (err) {
      console.error("Failed to execute action:", err);
    }
  }

  async function dismissAction(actionId: string) {
    try {
      const res = await fetch(`/api/autopilot/actions/${actionId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "dismissed" }),
      });
      if (res.ok) {
        await loadActions();
      }
    } catch (err) {
      console.error("Failed to dismiss action:", err);
    }
  }

  async function runScan() {
    try {
      const res = await fetch("/api/autopilot/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      if (res.ok) {
        await loadActions();
        await loadLastRun();
      }
    } catch (err) {
      console.error("Failed to run scan:", err);
    }
  }

  function getRiskColor(risk: string) {
    switch (risk) {
      case "high":
        return "bg-red-500/20 text-red-400 border-red-500/30";
      case "medium":
        return "bg-amber-500/20 text-amber-400 border-amber-500/30";
      case "low":
        return "bg-green-500/20 text-green-400 border-green-500/30";
      default:
        return "bg-zinc-500/20 text-zinc-400 border-zinc-500/30";
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-950 text-zinc-100 flex items-center justify-center">
        <div className="text-zinc-400">Loading actions...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Zap className="w-8 h-8 text-violet-400" />
            <div>
              <h1 className="text-3xl font-bold text-white">Autopilot Command Center</h1>
              <p className="text-sm text-zinc-400">
                Review and manage autopilot actions
              </p>
            </div>
          </div>
          <button
            onClick={runScan}
            className="px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white rounded-lg transition-colors flex items-center gap-2"
          >
            <Play className="w-4 h-4" />
            Run Scan
          </button>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-2">
          {["all", "suggested", "approved", "executed", "dismissed"].map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1 rounded text-sm transition-colors ${
                filter === f
                  ? "bg-violet-600 text-white"
                  : "bg-zinc-800 text-zinc-300 hover:bg-zinc-700"
              }`}
            >
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>

        {/* Actions List */}
        <div className="space-y-3">
          {actions.length === 0 ? (
            <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-8 text-center text-zinc-400">
              No actions found. Run a scan to find opportunities.
            </div>
          ) : (
            actions.map((action) => (
              <div
                key={action.id}
                className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-6 space-y-4"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-3">
                      <span className="text-lg font-semibold text-white capitalize">
                        {action.action_type.replace(/_/g, " ")}
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded text-xs border ${getRiskColor(
                          action.risk_level
                        )}`}
                      >
                        {action.risk_level} risk
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded text-xs ${
                          action.status === "executed"
                            ? "bg-green-500/20 text-green-400"
                            : action.status === "approved"
                            ? "bg-blue-500/20 text-blue-400"
                            : action.status === "dismissed"
                            ? "bg-zinc-500/20 text-zinc-400"
                            : "bg-amber-500/20 text-amber-400"
                        }`}
                      >
                        {action.status}
                      </span>
                    </div>
                    {action.suggested_summary && (
                      <p className="text-sm text-zinc-300">{action.suggested_summary}</p>
                    )}
                    <div className="text-xs text-zinc-500">
                      {new Date(action.created_at).toLocaleString()}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {action.status === "suggested" && (
                      <>
                        <button
                          onClick={() => approveAction(action.id)}
                          className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded text-sm transition-colors flex items-center gap-1"
                        >
                          <CheckCircle2 className="w-3 h-3" />
                          Approve
                        </button>
                        <button
                          onClick={() => executeAction(action.id)}
                          className="px-3 py-1 bg-green-600 hover:bg-green-700 text-white rounded text-sm transition-colors flex items-center gap-1"
                        >
                          <Play className="w-3 h-3" />
                          Execute
                        </button>
                        <button
                          onClick={() => dismissAction(action.id)}
                          className="px-3 py-1 bg-zinc-700 hover:bg-zinc-600 text-white rounded text-sm transition-colors flex items-center gap-1"
                        >
                          <X className="w-3 h-3" />
                          Dismiss
                        </button>
                      </>
                    )}
                    {action.status === "approved" && (
                      <button
                        onClick={() => executeAction(action.id)}
                        className="px-3 py-1 bg-green-600 hover:bg-green-700 text-white rounded text-sm transition-colors flex items-center gap-1"
                      >
                        <Play className="w-3 h-3" />
                        Execute
                      </button>
                    )}
                  </div>
                </div>
                {action.suggested_payload && (
                  <div className="bg-zinc-800/50 border border-zinc-700 rounded-lg p-3 text-sm text-zinc-300">
                    <pre className="whitespace-pre-wrap">
                      {JSON.stringify(action.suggested_payload, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}




