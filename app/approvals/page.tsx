"use client";

import { useEffect, useState, useCallback } from "react";
import { Shield, Check, X, Clock, RefreshCw, ChevronDown, ChevronUp } from "lucide-react";

interface Proposal {
  id: string;
  call_id: string;
  tool: string;
  scope: string;
  agent: string;
  intent: string;
  inputs: Record<string, unknown>;
  status: string;
  verdict: string;
  created_at: string;
  decided_at?: string;
  decided_by?: string;
  decision_note?: string;
  execution_result?: {
    summary: string;
    artifacts: unknown[];
  };
}

type Filter = "pending" | "approved" | "denied" | "executed" | "all";

export default function ApprovalsPage() {
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<Filter>("pending");
  const [expanded, setExpanded] = useState<string | null>(null);
  const [acting, setActing] = useState<string | null>(null);

  const fetchProposals = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/approvals?status=${filter}`);
      const data = await res.json();
      if (!data.ok) throw new Error(data.error);
      setProposals(data.proposals);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    fetchProposals();
  }, [fetchProposals]);

  async function handleAction(id: string, action: "approve" | "deny") {
    setActing(id);
    try {
      const res = await fetch(`/api/approvals/${id}/${action}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error);
      // Optimistic update
      setProposals((prev) =>
        prev.map((p) =>
          p.id === id
            ? { ...p, status: action === "approve" ? "executed" : "denied" }
            : p
        )
      );
    } catch (err: any) {
      setError(err.message);
    } finally {
      setActing(null);
    }
  }

  function formatTime(ts: string) {
    const d = new Date(ts);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffMin = Math.round(diffMs / 60000);
    if (diffMin < 1) return "just now";
    if (diffMin < 60) return `${diffMin}m ago`;
    const diffHr = Math.round(diffMin / 60);
    if (diffHr < 24) return `${diffHr}h ago`;
    return d.toLocaleDateString();
  }

  const statusColor: Record<string, string> = {
    pending: "text-amber-400 border-amber-400/30",
    approved: "text-emerald-400 border-emerald-400/30",
    executed: "text-emerald-400 border-emerald-400/30",
    denied: "text-red-400 border-red-400/30",
    expired: "text-zinc-500 border-zinc-500/30",
  };

  return (
    <div className="min-h-screen bg-zinc-950 pb-20">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-zinc-950/80 backdrop-blur-xl border-b border-zinc-800/50 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Shield className="w-6 h-6 text-violet-400" />
            <div>
              <h1 className="text-lg font-semibold text-white">Approvals</h1>
              <p className="text-xs text-zinc-500">Omega Gate proposals requiring human review</p>
            </div>
          </div>
          <button
            onClick={fetchProposals}
            className="p-2 rounded-lg hover:bg-zinc-800 transition-colors text-zinc-400 hover:text-white"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>

        {/* Filter tabs */}
        <div className="flex gap-2 mt-4">
          {(["pending", "executed", "denied", "all"] as Filter[]).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                filter === f
                  ? "bg-violet-500/20 text-violet-300 border border-violet-500/30"
                  : "text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800"
              }`}
            >
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="px-6 py-4 space-y-3">
        {error && (
          <div className="border border-red-500/30 rounded-lg p-3 text-sm text-red-400 bg-red-500/5">
            {error}
          </div>
        )}

        {loading && proposals.length === 0 && (
          <div className="text-center py-12 text-zinc-500 text-sm">Loading proposals...</div>
        )}

        {!loading && proposals.length === 0 && (
          <div className="text-center py-12">
            <Shield className="w-10 h-10 text-zinc-700 mx-auto mb-3" />
            <p className="text-zinc-500 text-sm">No {filter === "all" ? "" : filter} proposals</p>
          </div>
        )}

        {proposals.map((p) => (
          <div
            key={p.id}
            className="border border-zinc-800 rounded-xl bg-zinc-900/30 overflow-hidden"
          >
            {/* Main row */}
            <div className="p-4 flex items-start justify-between gap-4">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span
                    className={`text-[10px] uppercase font-bold px-1.5 py-0.5 rounded border ${
                      statusColor[p.status] ?? "text-zinc-400 border-zinc-600"
                    }`}
                  >
                    {p.status}
                  </span>
                  <span className="text-[10px] text-zinc-600 font-mono">{p.tool}</span>
                  <span className="text-[10px] text-zinc-700">via {p.agent}</span>
                </div>
                <p className="text-sm font-medium text-zinc-200 truncate">{p.intent}</p>
                <p className="text-xs text-zinc-500 mt-0.5 flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {formatTime(p.created_at)}
                </p>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                {p.status === "pending" && (
                  <>
                    <button
                      onClick={() => handleAction(p.id, "approve")}
                      disabled={acting === p.id}
                      className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20 transition-colors disabled:opacity-50"
                    >
                      <Check className="w-3.5 h-3.5" />
                      Approve
                    </button>
                    <button
                      onClick={() => handleAction(p.id, "deny")}
                      disabled={acting === p.id}
                      className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-lg bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20 transition-colors disabled:opacity-50"
                    >
                      <X className="w-3.5 h-3.5" />
                      Deny
                    </button>
                  </>
                )}
                <button
                  onClick={() => setExpanded(expanded === p.id ? null : p.id)}
                  className="p-1.5 rounded-lg hover:bg-zinc-800 transition-colors text-zinc-500"
                >
                  {expanded === p.id ? (
                    <ChevronUp className="w-4 h-4" />
                  ) : (
                    <ChevronDown className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>

            {/* Expanded detail */}
            {expanded === p.id && (
              <div className="border-t border-zinc-800/50 p-4 bg-zinc-900/50 space-y-3">
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <span className="text-zinc-600">Call ID</span>
                    <p className="text-zinc-400 font-mono mt-0.5">{p.call_id}</p>
                  </div>
                  <div>
                    <span className="text-zinc-600">Scope</span>
                    <p className="text-zinc-400 mt-0.5">{p.scope}</p>
                  </div>
                  {p.decided_by && (
                    <div>
                      <span className="text-zinc-600">Decided by</span>
                      <p className="text-zinc-400 font-mono mt-0.5">{p.decided_by}</p>
                    </div>
                  )}
                  {p.decision_note && (
                    <div>
                      <span className="text-zinc-600">Note</span>
                      <p className="text-zinc-400 mt-0.5">{p.decision_note}</p>
                    </div>
                  )}
                </div>

                {p.inputs && Object.keys(p.inputs).length > 0 && (
                  <div>
                    <span className="text-[10px] uppercase text-zinc-600 font-medium">Inputs</span>
                    <pre className="mt-1 text-xs text-zinc-400 bg-zinc-950 rounded-lg p-3 overflow-x-auto border border-zinc-800">
                      {JSON.stringify(p.inputs, null, 2)}
                    </pre>
                  </div>
                )}

                {p.execution_result && (
                  <div>
                    <span className="text-[10px] uppercase text-zinc-600 font-medium">
                      Proposal Result
                    </span>
                    <p className="text-xs text-zinc-300 mt-1">
                      {p.execution_result.summary}
                    </p>
                    {p.execution_result.artifacts?.length > 0 && (
                      <pre className="mt-1 text-xs text-zinc-400 bg-zinc-950 rounded-lg p-3 overflow-x-auto border border-zinc-800">
                        {JSON.stringify(p.execution_result.artifacts, null, 2)}
                      </pre>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
