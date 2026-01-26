"use client";

import React, { useState, useEffect } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

interface TraceSession {
  sessionId: string;
  traces: {
    id: string;
    traceType: string;
    reasoningSteps: { step: number; action: string; reasoning: string; durationMs?: number }[];
    output: Record<string, unknown>;
    durationMs?: number;
    success?: boolean;
    createdAt: string;
  }[];
  totalDurationMs: number;
  allSuccessful: boolean;
}

const TRACE_TYPE_COLORS: Record<string, string> = {
  observation: "text-cyan-400",
  intent_prediction: "text-blue-400",
  draft_generation: "text-purple-400",
  diagnosis: "text-amber-400",
  simulation: "text-emerald-400",
  evolution: "text-pink-400",
  guardian_check: "text-red-400",
};

export function ReasoningTrace() {
  const [sessions, setSessions] = useState<TraceSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedSession, setExpandedSession] = useState<string | null>(null);

  useEffect(() => {
    const fetchTraces = async () => {
      try {
        const res = await fetch("/api/omega/reasoning?limit=30");
        const data = await res.json();
        if (data.ok && data.grouped) {
          setSessions(data.traces);
        }
      } catch (err) {
        console.error("Failed to fetch reasoning traces:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchTraces();
  }, []);

  const formatDuration = (ms?: number) => {
    if (!ms) return "";
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(1)}s`;
  };

  return (
    <Card className="bg-zinc-900/50 border-zinc-800">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <span className="w-2 h-2 bg-emerald-500 rounded-full" />
          Reasoning Traces
        </CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="text-center text-zinc-500 py-4">Loading...</div>
        ) : sessions.length === 0 ? (
          <div className="text-center text-zinc-500 py-6">
            <p>No reasoning traces yet</p>
            <p className="text-sm mt-1">Process a signal to see how Omega thinks</p>
          </div>
        ) : (
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {sessions.map((session) => {
              const isExpanded = expandedSession === session.sessionId;

              return (
                <div
                  key={session.sessionId}
                  className="border border-zinc-800 rounded-lg overflow-hidden"
                >
                  {/* Session header */}
                  <button
                    onClick={() => setExpandedSession(isExpanded ? null : session.sessionId)}
                    className="w-full p-3 flex items-center gap-3 hover:bg-zinc-800/50 transition-colors"
                  >
                    <span
                      className={`w-2 h-2 rounded-full ${
                        session.allSuccessful ? "bg-emerald-500" : "bg-amber-500"
                      }`}
                    />
                    <span className="text-sm text-zinc-300">
                      {session.traces[0]?.createdAt
                        ? new Date(session.traces[0].createdAt).toLocaleTimeString()
                        : "Session"}
                    </span>
                    <span className="text-xs text-zinc-500">
                      {session.traces.length} steps
                    </span>
                    <span className="ml-auto text-xs text-zinc-600">
                      {formatDuration(session.totalDurationMs)}
                    </span>
                  </button>

                  {/* Expanded traces */}
                  {isExpanded && (
                    <div className="border-t border-zinc-800 p-2 space-y-2 bg-zinc-800/20">
                      {session.traces.map((trace, i) => (
                        <div key={trace.id} className="p-2 bg-zinc-800/50 rounded">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-xs font-mono text-zinc-600">
                              {String(i + 1).padStart(2, "0")}
                            </span>
                            <span
                              className={`text-sm ${
                                TRACE_TYPE_COLORS[trace.traceType] || "text-zinc-400"
                              }`}
                            >
                              {trace.traceType.replace(/_/g, " ")}
                            </span>
                            <span className="ml-auto text-xs text-zinc-600">
                              {formatDuration(trace.durationMs)}
                            </span>
                            {trace.success === false && (
                              <span className="text-xs text-red-400">failed</span>
                            )}
                          </div>

                          {/* Reasoning steps */}
                          {trace.reasoningSteps?.map((step, j) => (
                            <div key={j} className="ml-4 mt-1 text-xs text-zinc-500">
                              <span className="text-zinc-600">{step.action}:</span>{" "}
                              {step.reasoning?.slice(0, 100)}
                              {step.reasoning?.length > 100 && "..."}
                            </div>
                          ))}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
