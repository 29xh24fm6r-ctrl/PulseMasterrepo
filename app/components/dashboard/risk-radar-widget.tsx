// Risk Radar Widget
// app/components/dashboard/risk-radar-widget.tsx

"use client";

import { useState, useEffect } from "react";
import { AlertTriangle, Clock, ArrowRight } from "lucide-react";
import Link from "next/link";

interface Prediction {
  id: string;
  window_start: string;
  window_end: string;
  context: string;
  context_id: string | null;
  risk_type: string;
  risk_score: number;
  recommended_action: string;
}

const RISK_COLORS: Record<string, string> = {
  stress_spike: "red",
  procrastination: "orange",
  overwhelm: "amber",
  burnout: "red",
  slump: "blue",
};

const RISK_LABELS: Record<string, string> = {
  stress_spike: "Stress Spike",
  procrastination: "Procrastination",
  overwhelm: "Overwhelm",
  burnout: "Burnout Risk",
  slump: "Energy Slump",
};

export function RiskRadarWidget() {
  const [predictions, setPredictions] = useState<Prediction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadPredictions();
  }, []);

  async function loadPredictions() {
    try {
      const res = await fetch("/api/prediction/today");
      const data = await res.json();
      if (res.ok) {
        setPredictions(data.predictions || []);
      }
    } catch (err) {
      console.error("Failed to load predictions:", err);
    } finally {
      setLoading(false);
    }
  }

  function formatTime(timestamp: string): string {
    const date = new Date(timestamp);
    return date.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
  }

  function getRiskColor(riskType: string): string {
    const color = RISK_COLORS[riskType] || "zinc";
    if (color === "red") return "text-red-400 bg-red-500/20 border-red-500/50";
    if (color === "orange") return "text-orange-400 bg-orange-500/20 border-orange-500/50";
    if (color === "amber") return "text-amber-400 bg-amber-500/20 border-amber-500/50";
    if (color === "blue") return "text-blue-400 bg-blue-500/20 border-blue-500/50";
    return "text-zinc-400 bg-zinc-500/20 border-zinc-500/50";
  }

  function getRiskIntensity(score: number): string {
    if (score >= 0.7) return "High";
    if (score >= 0.4) return "Medium";
    return "Low";
  }

  if (loading) {
    return (
      <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-4">
        <div className="text-sm text-zinc-400">Loading predictions...</div>
      </div>
    );
  }

  if (predictions.length === 0) {
    return (
      <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-4">
        <div className="flex items-center gap-2 mb-2">
          <AlertTriangle className="w-4 h-4 text-amber-400" />
          <h3 className="text-sm font-semibold text-white">Risk Radar</h3>
        </div>
        <div className="text-xs text-zinc-400">
          No risk predictions for today. You're in the clear!
        </div>
      </div>
    );
  }

  const sortedPredictions = [...predictions].sort((a, b) => {
    const timeA = new Date(a.window_start).getTime();
    const timeB = new Date(b.window_start).getTime();
    return timeA - timeB;
  });

  return (
    <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-4 space-y-3">
      <div className="flex items-center gap-2">
        <AlertTriangle className="w-4 h-4 text-amber-400" />
        <h3 className="text-sm font-semibold text-white">Risk Radar</h3>
      </div>

      <div className="space-y-2">
        {sortedPredictions.slice(0, 5).map((prediction) => {
          const riskColor = getRiskColor(prediction.risk_type);
          const intensity = getRiskIntensity(prediction.risk_score);
          const isHigh = prediction.risk_score >= 0.7;

          return (
            <div
              key={prediction.id}
              className={`border rounded-lg p-2.5 space-y-1.5 ${isHigh ? "border-red-500/50 bg-red-500/5" : "border-zinc-700 bg-zinc-800/30"}`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Clock className="w-3 h-3 text-zinc-400" />
                  <span className="text-xs font-medium text-white">
                    {formatTime(prediction.window_start)}
                  </span>
                  {prediction.context === "calendar_event" && (
                    <span className="text-xs text-zinc-500">• Event</span>
                  )}
                </div>
                <span className={`px-1.5 py-0.5 rounded text-xs border ${riskColor}`}>
                  {intensity} {RISK_LABELS[prediction.risk_type] || prediction.risk_type}
                </span>
              </div>

              {prediction.recommended_action && (
                <div className="text-xs text-zinc-400 flex items-start gap-1.5">
                  <ArrowRight className="w-3 h-3 mt-0.5 flex-shrink-0 text-violet-400" />
                  <span>{prediction.recommended_action}</span>
                </div>
              )}

              {prediction.context === "calendar_event" && prediction.context_id && (
                <Link
                  href={`/calendar?event=${prediction.context_id}`}
                  className="text-xs text-violet-400 hover:text-violet-300 flex items-center gap-1"
                >
                  View event <ArrowRight className="w-3 h-3" />
                </Link>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

