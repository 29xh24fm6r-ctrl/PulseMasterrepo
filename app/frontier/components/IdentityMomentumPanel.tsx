"use client";

import { TrendingUp, TrendingDown, Minus, Star } from "lucide-react";

interface MomentumDay {
  date: string;
  alignment_score: number;
  net_momentum: number;
  active_values: string[];
  insight: string;
}

interface Props {
  momentum: MomentumDay[];
}

export function IdentityMomentumPanel({ momentum }: Props) {
  const latestDay = momentum[0];
  const avgMomentum = momentum.length > 0
    ? momentum.reduce((sum, m) => sum + (m.net_momentum || 0), 0) / momentum.length
    : 0;

  const trendIcon = avgMomentum > 0.1 
    ? <TrendingUp className="w-5 h-5 text-green-400" />
    : avgMomentum < -0.1 
      ? <TrendingDown className="w-5 h-5 text-red-400" />
      : <Minus className="w-5 h-5 text-zinc-400" />;

  const trendLabel = avgMomentum > 0.1 ? "Growing" : avgMomentum < -0.1 ? "Declining" : "Stable";
  const trendColor = avgMomentum > 0.1 ? "text-green-400" : avgMomentum < -0.1 ? "text-red-400" : "text-zinc-400";

  return (
    <div className="bg-zinc-800/50 rounded-2xl p-6 border border-zinc-700/50">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-cyan-500/20 rounded-lg">
            <Star className="w-5 h-5 text-cyan-400" />
          </div>
          <h3 className="font-semibold text-lg">Identity Momentum</h3>
        </div>
        <div className={`flex items-center gap-2 ${trendColor}`}>
          {trendIcon}
          <span className="text-sm font-medium">{trendLabel}</span>
        </div>
      </div>

      {momentum.length === 0 ? (
        <p className="text-zinc-500">No identity data yet. Complete tasks aligned with your values to build momentum.</p>
      ) : (
        <>
          {/* Weekly bar chart */}
          <div className="flex items-end gap-2 h-24 mb-4">
            {momentum.slice(0, 7).reverse().map((day, i) => {
              const height = Math.max(10, (day.alignment_score || 0) * 100);
              const bgColor = day.net_momentum > 0 ? "bg-green-500" : day.net_momentum < 0 ? "bg-red-500" : "bg-zinc-600";
              return (
                <div key={i} className="flex-1 flex flex-col items-center">
                  <div 
                    className={`w-full ${bgColor} rounded-t-sm transition-all`} 
                    style={{ height: `${height}%` }}
                  />
                  <span className="text-xs text-zinc-500 mt-1">
                    {new Date(day.date).toLocaleDateString("en-US", { weekday: "short" }).charAt(0)}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Latest insight */}
          {latestDay?.insight && (
            <div className="bg-zinc-900/50 rounded-lg p-3">
              <p className="text-xs text-zinc-500 mb-1">Latest Insight</p>
              <p className="text-sm text-zinc-300">{latestDay.insight}</p>
            </div>
          )}

          {/* Active values */}
          {latestDay?.active_values?.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2">
              {latestDay.active_values.map((value, i) => (
                <span key={i} className="px-2 py-1 bg-cyan-500/20 text-cyan-300 rounded-full text-xs">
                  {value}
                </span>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}