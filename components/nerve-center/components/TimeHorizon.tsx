"use client";

import React from 'react';
import { TimeHorizonState } from '../types/nerve-center';

interface TimeHorizonProps {
  timeHorizon: TimeHorizonState;
}

export function TimeHorizon({ timeHorizon }: TimeHorizonProps) {
  const getLoadColor = (load: number) => {
    if (load >= 90) return 'text-rose-500';
    if (load >= 75) return 'text-amber-500';
    if (load >= 50) return 'text-violet-500';
    return 'text-emerald-500';
  };

  const getLoadGlow = (load: number) => {
    if (load >= 90) return 'shadow-rose-500/50';
    if (load >= 75) return 'shadow-amber-500/50';
    if (load >= 50) return 'shadow-violet-500/50';
    return 'shadow-emerald-500/50';
  };

  return (
    <div className="bg-zinc-900/50 border border-zinc-800 rounded-lg p-6 animate-fade-in">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-bold text-zinc-400 uppercase tracking-wide">
          TIME HORIZON
        </h2>
        <div className="text-xs text-zinc-500">7-day forecast</div>
      </div>

      <div className="space-y-4">
        {/* Current Load - Hero Metric */}
        <div className="p-4 bg-zinc-800/50 rounded-lg border border-zinc-700">
          <div className="flex items-end justify-between">
            <div>
              <div className={`text-4xl font-bold ${getLoadColor(timeHorizon.currentLoad)} ${getLoadGlow(timeHorizon.currentLoad)} shadow-lg tabular-nums`}>
                {timeHorizon.currentLoad}%
              </div>
              <div className="text-xs text-zinc-400 uppercase tracking-wide mt-1">
                Current Load
              </div>
            </div>
            <div className="flex flex-col items-end gap-1 text-xs text-zinc-500">
              <div className="flex items-center gap-2">
                <span>Tomorrow:</span>
                <span className={`font-bold ${getLoadColor(timeHorizon.projectedLoad.tomorrow)}`}>
                  {timeHorizon.projectedLoad.tomorrow}%
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span>Next week:</span>
                <span className={`font-bold ${getLoadColor(timeHorizon.projectedLoad.nextWeek)}`}>
                  {timeHorizon.projectedLoad.nextWeek}%
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Load Trajectory Chart */}
        <div className="space-y-2">
          <div className="text-xs text-zinc-500 uppercase">Load Trajectory</div>
          <div className="h-20 flex items-end gap-2">
            {Object.entries(timeHorizon.projectedLoad).map(([key, value], idx) => (
              <div key={key} className="flex-1 flex flex-col items-center gap-1">
                <div className="w-full bg-zinc-800 rounded-t overflow-hidden" style={{ height: '100%' }}>
                  <div
                    className={`w-full transition-all duration-1000 ${
                      value >= 90 ? 'bg-rose-500' :
                      value >= 75 ? 'bg-amber-500' :
                      value >= 50 ? 'bg-violet-500' :
                      'bg-emerald-500'
                    }`}
                    style={{
                      height: `${value}%`,
                      transitionDelay: `${idx * 100}ms`
                    }}
                  />
                </div>
                <div className="text-[10px] text-zinc-600 uppercase truncate w-full text-center">
                  {key.replace(/([A-Z])/g, ' $1').trim()}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Critical Path */}
        <div className="space-y-2 pt-2 border-t border-zinc-800">
          <div className="text-xs text-zinc-500 uppercase tracking-wide">Critical Path</div>
          <div className="space-y-2">
            {timeHorizon.criticalPath.map((item, idx) => {
              const impactColor =
                item.impact === 'critical' ? 'text-rose-400' :
                item.impact === 'high' ? 'text-amber-400' :
                'text-zinc-500';

              const impactBg =
                item.impact === 'critical' ? 'bg-rose-500/10 border-rose-500/30' :
                item.impact === 'high' ? 'bg-amber-500/10 border-amber-500/30' :
                'bg-zinc-800/50 border-zinc-700';

              return (
                <div
                  key={idx}
                  className={`
                    flex items-center justify-between p-2 rounded border
                    ${impactBg} animate-slide-up
                  `}
                  style={{ animationDelay: `${idx * 75}ms` }}
                >
                  <span className="text-xs text-zinc-300 truncate flex-1">
                    {item.label}
                  </span>
                  <span className={`text-xs font-mono font-bold ${impactColor} ml-2 whitespace-nowrap`}>
                    {item.time}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Capacity Forecast */}
        <div className="pt-3 border-t border-zinc-800">
          <div className="text-xs text-zinc-500 uppercase tracking-wide mb-3">
            Capacity Forecast
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-zinc-400">Available</span>
              <span className="font-mono text-emerald-400 font-bold">
                {timeHorizon.capacityForecast.available}h
              </span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-zinc-400">Allocated</span>
              <span className="font-mono text-violet-400 font-bold">
                {timeHorizon.capacityForecast.allocated}h
              </span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-zinc-400">Buffer</span>
              <span className={`font-mono font-bold ${
                timeHorizon.capacityForecast.buffer < 0 ? 'text-rose-400' : 'text-emerald-400'
              }`}>
                {timeHorizon.capacityForecast.buffer > 0 ? '+' : ''}{timeHorizon.capacityForecast.buffer}h
              </span>
            </div>
          </div>

          {timeHorizon.capacityForecast.buffer < 0 && (
            <div className="mt-3 px-3 py-2 bg-rose-500/10 border border-rose-500/30 rounded text-xs text-rose-400 font-semibold">
              ⚠️ OVERCOMMITTED
            </div>
          )}
        </div>

        {/* Recommendations */}
        {timeHorizon.recommendations.length > 0 && (
          <div className="pt-3 border-t border-zinc-800">
            <div className="text-xs text-zinc-500 uppercase tracking-wide mb-2">
              Recommendations
            </div>
            <div className="space-y-1">
              {timeHorizon.recommendations.map((rec, idx) => (
                <div
                  key={idx}
                  className="flex items-start gap-2 text-xs text-zinc-400 animate-slide-up"
                  style={{ animationDelay: `${idx * 100}ms` }}
                >
                  <span className="text-violet-500 mt-0.5">→</span>
                  <span className="flex-1 leading-relaxed">{rec}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
