"use client";

import React from 'react';
import { PulseMindState } from '../types/nerve-center';

interface PulseMindProps {
  pulseMind: PulseMindState;
}

export function PulseMind({ pulseMind }: PulseMindProps) {
  const getActivityColor = () => {
    switch (pulseMind.currentActivity) {
      case 'SEEING':
        return {
          bg: 'bg-blue-500',
          text: 'text-blue-400',
          glow: 'shadow-blue-500/50'
        };
      case 'DOING':
        return {
          bg: 'bg-violet-500',
          text: 'text-violet-400',
          glow: 'shadow-violet-500/50'
        };
      case 'REMEMBERING':
        return {
          bg: 'bg-emerald-500',
          text: 'text-emerald-400',
          glow: 'shadow-emerald-500/50'
        };
    }
  };

  const colors = getActivityColor();

  return (
    <div className="bg-zinc-900/50 border border-zinc-800 rounded-lg p-6 animate-fade-in">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-bold text-zinc-400 uppercase tracking-wide">
          PULSE MIND
        </h2>
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${colors.bg} animate-pulse ${colors.glow} shadow-lg`} />
          <span className="text-xs text-zinc-500">Active</span>
        </div>
      </div>

      <div className="space-y-4">
        {/* Current Activity */}
        <div className="p-4 bg-zinc-800/50 rounded-lg border border-zinc-700">
          <div className="flex items-center gap-3 mb-2">
            <div className={`w-3 h-3 rounded-full ${colors.bg} animate-pulse ${colors.glow} shadow-lg`} />
            <div className={`text-sm font-bold ${colors.text} uppercase tracking-wide`}>
              {pulseMind.currentActivity}
            </div>
          </div>
          <div className="text-sm text-zinc-300 leading-relaxed">
            {pulseMind.activityDetail}
          </div>
        </div>

        {/* Confidence & Status */}
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <span className="text-zinc-500">Confidence:</span>
            <div className="flex items-center gap-1">
              <div className="w-20 h-1.5 bg-zinc-700 rounded-full overflow-hidden">
                <div
                  className="h-full bg-violet-500 transition-all duration-500"
                  style={{ width: `${pulseMind.confidence * 100}%` }}
                />
              </div>
              <span className="text-zinc-400 font-mono tabular-nums w-10">
                {Math.round(pulseMind.confidence * 100)}%
              </span>
            </div>
          </div>
          <div className="text-zinc-500">
            <span className="text-violet-400 font-bold">{pulseMind.activeProcesses}</span> running
          </div>
        </div>

        {/* Recent Activity Log */}
        <div className="space-y-2 pt-3 border-t border-zinc-800">
          <div className="text-xs text-zinc-500 uppercase tracking-wide">Recent Activity</div>
          <div className="space-y-2 max-h-40 overflow-y-auto">
            {pulseMind.recentActions.map((action, idx) => {
              const actionColor =
                action.type === 'SEEING' ? 'text-blue-400' :
                action.type === 'DOING' ? 'text-violet-400' :
                'text-emerald-400';

              const timeSince = Math.floor((Date.now() - action.timestamp.getTime()) / 60000);

              return (
                <div
                  key={idx}
                  className="flex items-start gap-2 text-xs animate-slide-up"
                  style={{ animationDelay: `${idx * 100}ms` }}
                >
                  <div className={`font-mono font-bold ${actionColor} min-w-[90px] uppercase text-[10px] tracking-wider`}>
                    {action.type}
                  </div>
                  <div className="flex-1 text-zinc-400 leading-relaxed">
                    {action.description}
                  </div>
                  <div className="text-zinc-600 font-mono text-[10px] whitespace-nowrap">
                    {timeSince}m ago
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Queue Status */}
        {pulseMind.queuedTasks > 0 && (
          <div className="flex items-center justify-between px-3 py-2 bg-violet-500/10 border border-violet-500/30 rounded text-xs">
            <span className="text-violet-400 font-semibold">
              {pulseMind.queuedTasks} tasks queued
            </span>
            <span className="text-zinc-500">Processing...</span>
          </div>
        )}
      </div>
    </div>
  );
}
