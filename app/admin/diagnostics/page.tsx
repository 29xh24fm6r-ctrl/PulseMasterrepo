"use client";

/**
 * Diagnostics Page (Admin)
 * Shows system health, errors, and kill switches
 * app/admin/diagnostics/page.tsx
 */

import { useState, useEffect } from "react";

interface DiagnosticData {
  latestErrors: Array<{ id: string; message: string; occurred_at: string }>;
  slowEndpoints: Array<{ path: string; avg_ms: number; count: number }>;
  recentSessions: Array<{ id: string; started_at: string; duration: number; status: string }>;
  killSwitches: {
    web_intel_enabled: boolean;
    aggressive_nudges_enabled: boolean;
    pulse_live_recording_enabled: boolean;
  };
}

export default function DiagnosticsPage() {
  const [data, setData] = useState<DiagnosticData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/admin/diagnostics")
      .then((r) => r.json())
      .then((d) => {
        if (d.ok) {
          setData(d.data);
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  async function toggleKillSwitch(key: string, current: boolean) {
    const res = await fetch("/api/admin/diagnostics/kill-switch", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key, enabled: !current }),
    });

    if (res.ok) {
      // Refresh
      const newData = await fetch("/api/admin/diagnostics").then((r) => r.json());
      if (newData.ok) {
        setData(newData.data);
      }
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-950 text-white p-8">
        <div className="max-w-6xl mx-auto">Loading diagnostics...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-white p-8">
      <div className="max-w-6xl mx-auto space-y-6">
        <h1 className="text-3xl font-bold">🔧 System Diagnostics</h1>

        {/* Kill Switches */}
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-6">
          <h2 className="text-xl font-semibold mb-4">Kill Switches</h2>
          <div className="space-y-3">
            {data?.killSwitches &&
              Object.entries(data.killSwitches).map(([key, enabled]) => (
                <div key={key} className="flex items-center justify-between">
                  <div>
                    <div className="font-medium">{key.replace(/_/g, " ")}</div>
                    <div className="text-sm text-zinc-400">
                      {enabled ? "Enabled" : "Disabled"}
                    </div>
                  </div>
                  <button
                    onClick={() => toggleKillSwitch(key, enabled)}
                    className={`px-4 py-2 rounded-lg font-semibold ${
                      enabled
                        ? "bg-red-600 hover:bg-red-700"
                        : "bg-emerald-600 hover:bg-emerald-700"
                    }`}
                  >
                    {enabled ? "Disable" : "Enable"}
                  </button>
                </div>
              ))}
          </div>
        </div>

        {/* Recent Sessions */}
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-6">
          <h2 className="text-xl font-semibold mb-4">Recent Pulse Live Sessions</h2>
          <div className="space-y-2">
            {data?.recentSessions?.length ? (
              data.recentSessions.map((s) => (
                <div
                  key={s.id}
                  className="flex items-center justify-between p-3 rounded-lg border border-zinc-800 bg-zinc-950/40"
                >
                  <div>
                    <div className="font-mono text-xs">{s.id.substring(0, 8)}...</div>
                    <div className="text-sm text-zinc-400">
                      {new Date(s.started_at).toLocaleString()} • {s.duration}s • {s.status}
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-zinc-400">No recent sessions</div>
            )}
          </div>
        </div>

        {/* Latest Errors */}
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-6">
          <h2 className="text-xl font-semibold mb-4">Latest Errors</h2>
          <div className="space-y-2">
            {data?.latestErrors?.length ? (
              data.latestErrors.map((e) => (
                <div
                  key={e.id}
                  className="p-3 rounded-lg border border-red-500/30 bg-red-500/10"
                >
                  <div className="text-sm font-mono">{e.message}</div>
                  <div className="text-xs text-zinc-400 mt-1">
                    {new Date(e.occurred_at).toLocaleString()}
                  </div>
                </div>
              ))
            ) : (
              <div className="text-zinc-400">No errors logged</div>
            )}
          </div>
        </div>

        {/* Slow Endpoints */}
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-6">
          <h2 className="text-xl font-semibold mb-4">Slow Endpoints</h2>
          <div className="space-y-2">
            {data?.slowEndpoints?.length ? (
              data.slowEndpoints.map((ep) => (
                <div
                  key={ep.path}
                  className="flex items-center justify-between p-3 rounded-lg border border-zinc-800 bg-zinc-950/40"
                >
                  <div className="font-mono text-sm">{ep.path}</div>
                  <div className="text-sm text-zinc-400">
                    {ep.avg_ms.toFixed(0)}ms avg ({ep.count} calls)
                  </div>
                </div>
              ))
            ) : (
              <div className="text-zinc-400">No slow endpoints detected</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

