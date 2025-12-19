"use client";

import { TrendingUp, TrendingDown, Minus, AlertTriangle } from "lucide-react";

interface RelationshipHealthCardProps {
  score: number;
  trend: string;
  drivers: string[];
  flags: string[];
}

export function RelationshipHealthCard({
  score,
  trend,
  drivers,
  flags,
}: RelationshipHealthCardProps) {
  const getScoreColor = (s: number) => {
    if (s >= 80) return "text-green-400";
    if (s >= 60) return "text-amber-400";
    if (s >= 40) return "text-yellow-400";
    return "text-red-400";
  };

  const getScoreBg = (s: number) => {
    if (s >= 80) return "bg-green-500/10 border-green-500/30";
    if (s >= 60) return "bg-amber-500/10 border-amber-500/30";
    if (s >= 40) return "bg-yellow-500/10 border-yellow-500/30";
    return "bg-red-500/10 border-red-500/30";
  };

  const TrendIcon = trend === "improving" ? TrendingUp : trend === "declining" ? TrendingDown : Minus;

  return (
    <div className={`rounded-xl p-5 border ${getScoreBg(score)}`}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-gray-300">Relationship Health</h3>
        <TrendIcon className={`w-4 h-4 ${
          trend === "improving" ? "text-green-400" : trend === "declining" ? "text-red-400" : "text-gray-400"
        }`} />
      </div>
      
      <div className="mb-4">
        <div className={`text-4xl font-bold ${getScoreColor(score)} mb-1`}>
          {score}
        </div>
        <div className="text-xs text-gray-400">out of 100</div>
      </div>

      {drivers.length > 0 && (
        <div className="mb-4">
          <div className="text-xs text-gray-400 mb-2">Key Drivers</div>
          <div className="space-y-1">
            {drivers.slice(0, 3).map((driver, i) => (
              <div key={i} className="text-xs text-gray-300">• {driver}</div>
            ))}
          </div>
        </div>
      )}

      {flags.length > 0 && (
        <div>
          <div className="flex items-center gap-1 text-xs text-red-400 mb-2">
            <AlertTriangle className="w-3 h-3" />
            <span>Risk Flags</span>
          </div>
          <div className="space-y-1">
            {flags.slice(0, 3).map((flag, i) => (
              <div key={i} className="text-xs text-red-300">• {flag}</div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

