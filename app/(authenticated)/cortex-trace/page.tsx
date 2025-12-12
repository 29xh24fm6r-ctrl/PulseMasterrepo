// Pulse Cortex Trace Viewer
// app/(authenticated)/cortex-trace/page.tsx

"use client";

import { useState, useEffect } from "react";
import { PulseTraceEntry, TraceSource, TraceLevel } from "@/lib/cortex/trace/types";
import { AnimatedList, AnimatedListItem } from "@/components/ui/AnimatedList";
import { AppCard } from "@/components/ui/AppCard";
import { LoadingState } from "@/components/ui/LoadingState";
import { Badge } from "@/components/ui/badge";
import { Brain, Zap, AlertTriangle, Info, Bug } from "lucide-react";
import { cn } from "@/lib/utils";

export default function CortexTracePage() {
  const [entries, setEntries] = useState<PulseTraceEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<{
    source?: TraceSource;
    level?: TraceLevel;
  }>({});

  useEffect(() => {
    loadTrace();
    // Auto-refresh every 5 seconds
    const interval = setInterval(loadTrace, 5000);
    return () => clearInterval(interval);
  }, [filter]);

  async function loadTrace() {
    try {
      const params = new URLSearchParams();
      if (filter.source) params.set("source", filter.source);
      if (filter.level) params.set("level", filter.level);
      params.set("limit", "100");

      const res = await fetch(`/api/cortex/trace?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setEntries(data.entries || []);
      }
    } catch (err) {
      console.error("Failed to load trace:", err);
    } finally {
      setLoading(false);
    }
  }

  function getLevelIcon(level: TraceLevel) {
    switch (level) {
      case "error":
        return <AlertTriangle className="w-4 h-4 text-red-400" />;
      case "warn":
        return <AlertTriangle className="w-4 h-4 text-yellow-400" />;
      case "debug":
        return <Bug className="w-4 h-4 text-zinc-400" />;
      default:
        return <Info className="w-4 h-4 text-blue-400" />;
    }
  }

  function getSourceColor(source: TraceSource) {
    switch (source) {
      case "cortex":
        return "bg-violet-500/20 text-violet-400 border-violet-500/30";
      case "autonomy":
        return "bg-orange-500/20 text-orange-400 border-orange-500/30";
      case "executive":
        return "bg-blue-500/20 text-blue-400 border-blue-500/30";
      case "longitudinal":
        return "bg-green-500/20 text-green-400 border-green-500/30";
      case "third_brain":
        return "bg-purple-500/20 text-purple-400 border-purple-500/30";
      case "emotion":
        return "bg-pink-500/20 text-pink-400 border-pink-500/30";
      default:
        return "bg-zinc-500/20 text-zinc-400 border-zinc-500/30";
    }
  }

  return (
    <main className="flex flex-col gap-4 p-4 lg:p-6 max-w-7xl mx-auto">
      <header className="flex items-center justify-between gap-4 mb-2">
        <div>
          <h1 className="text-3xl font-bold text-white mb-1">Pulse Cortex Trace</h1>
          <p className="text-sm text-zinc-400">
            Live feed of Pulse's cognitive decisions and actions
          </p>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={filter.source || ""}
            onChange={(e) =>
              setFilter({ ...filter, source: (e.target.value || undefined) as TraceSource | undefined })
            }
            className="px-3 py-1.5 bg-zinc-900 border border-zinc-800 rounded-lg text-sm text-white"
          >
            <option value="">All Sources</option>
            <option value="cortex">Cortex</option>
            <option value="autonomy">Autonomy</option>
            <option value="executive">Executive</option>
            <option value="longitudinal">Longitudinal</option>
            <option value="third_brain">Third Brain</option>
            <option value="emotion">Emotion</option>
            <option value="mesh">Mesh</option>
          </select>
          <select
            value={filter.level || ""}
            onChange={(e) =>
              setFilter({ ...filter, level: (e.target.value || undefined) as TraceLevel | undefined })
            }
            className="px-3 py-1.5 bg-zinc-900 border border-zinc-800 rounded-lg text-sm text-white"
          >
            <option value="">All Levels</option>
            <option value="info">Info</option>
            <option value="debug">Debug</option>
            <option value="warn">Warning</option>
            <option value="error">Error</option>
          </select>
        </div>
      </header>

      <AppCard title="Trace Entries" description={`${entries.length} entries`}>
        {loading && entries.length === 0 ? (
          <LoadingState message="Loading trace entries…" />
        ) : entries.length === 0 ? (
          <div className="text-center py-8 text-sm text-zinc-400">
            No trace entries found
          </div>
        ) : (
          <AnimatedList>
            {entries.map((entry) => (
              <AnimatedListItem key={entry.id}>
                <div
                  className={cn(
                    "p-4 rounded-lg border transition-all",
                    "bg-zinc-900/50 border-zinc-800",
                    entry.level === "error" && "border-red-500/30 bg-red-500/5",
                    entry.level === "warn" && "border-yellow-500/30 bg-yellow-500/5"
                  )}
                >
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div className="flex items-center gap-2">
                      {getLevelIcon(entry.level)}
                      <Badge
                        className={cn(
                          "text-xs font-medium border",
                          getSourceColor(entry.source)
                        )}
                      >
                        {entry.source}
                      </Badge>
                      <Badge
                        variant="outline"
                        className="text-xs"
                      >
                        {entry.level}
                      </Badge>
                    </div>
                    <span className="text-xs text-zinc-500">
                      {new Date(entry.timestamp).toLocaleTimeString()}
                    </span>
                  </div>
                  <p className="text-sm text-white mb-2">{entry.message}</p>
                  {entry.context && Object.keys(entry.context).length > 0 && (
                    <div className="text-xs text-zinc-400 mb-2">
                      {entry.context.domain && (
                        <span className="mr-3">Domain: {entry.context.domain}</span>
                      )}
                      {entry.context.actionId && (
                        <span className="mr-3">Action: {entry.context.actionId.substring(0, 8)}</span>
                      )}
                      {entry.context.policyId && (
                        <span>Policy: {entry.context.policyId}</span>
                      )}
                    </div>
                  )}
                  {entry.data && Object.keys(entry.data).length > 0 && (
                    <details className="mt-2">
                      <summary className="text-xs text-zinc-500 cursor-pointer hover:text-zinc-400">
                        View data
                      </summary>
                      <pre className="mt-2 p-2 bg-zinc-950 rounded text-xs text-zinc-300 overflow-x-auto">
                        {JSON.stringify(entry.data, null, 2)}
                      </pre>
                    </details>
                  )}
                </div>
              </AnimatedListItem>
            ))}
          </AnimatedList>
        )}
      </AppCard>
    </main>
  );
}



