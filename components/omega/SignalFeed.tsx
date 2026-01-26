"use client";

import React, { useState, useEffect } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

interface Signal {
  id: string;
  source: string;
  signal_type: string;
  payload: Record<string, unknown>;
  processed: boolean;
  created_at: string;
}

const SOURCE_ICONS: Record<string, string> = {
  calendar: "📅",
  email: "📧",
  crm: "👥",
  finance: "💰",
  task: "✓",
  manual: "✍️",
};

export function SignalFeed() {
  const [signals, setSignals] = useState<Signal[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSignals = async () => {
      try {
        const res = await fetch("/api/omega/signal?limit=20");
        const data = await res.json();
        if (data.ok) {
          setSignals(data.signals);
        }
      } catch (err) {
        console.error("Failed to fetch signals:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchSignals();
    // Refresh every 30 seconds
    const interval = setInterval(fetchSignals, 30000);
    return () => clearInterval(interval);
  }, []);

  const formatTime = (isoString: string) => {
    const date = new Date(isoString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 1) return "just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    return date.toLocaleDateString();
  };

  return (
    <Card className="bg-zinc-900/50 border-zinc-800">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <span className="w-2 h-2 bg-cyan-500 rounded-full" />
          Signal Feed
        </CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="text-center text-zinc-500 py-4">Loading signals...</div>
        ) : signals.length === 0 ? (
          <div className="text-center text-zinc-500 py-8">
            <p className="text-xl mb-1">No signals yet</p>
            <p className="text-sm">Signals will appear as they're detected</p>
          </div>
        ) : (
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {signals.map((signal) => (
              <div
                key={signal.id}
                className={`p-3 rounded-lg border transition-colors ${
                  signal.processed
                    ? "bg-zinc-800/30 border-zinc-800"
                    : "bg-zinc-800/50 border-zinc-700"
                }`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-lg">
                    {SOURCE_ICONS[signal.source] || "📡"}
                  </span>
                  <span className="text-sm font-medium text-zinc-200">
                    {signal.source}
                  </span>
                  <span className="text-xs text-zinc-500">
                    {signal.signal_type.replace(/_/g, " ")}
                  </span>
                  <span className="ml-auto text-xs text-zinc-600">
                    {formatTime(signal.created_at)}
                  </span>
                </div>
                <div className="text-xs text-zinc-400 truncate">
                  {JSON.stringify(signal.payload).slice(0, 100)}...
                </div>
                {signal.processed && (
                  <div className="mt-1 text-xs text-emerald-500/70">
                    ✓ Processed
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
