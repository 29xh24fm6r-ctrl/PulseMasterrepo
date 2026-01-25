"use client";

import React from 'react';
import { PriorityItem } from '../types/nerve-center';

interface WhatNeedsYouProps {
  priorities: PriorityItem[];
}

export function WhatNeedsYou({ priorities }: WhatNeedsYouProps) {
  return (
    <section className="bg-zinc-900/50 border border-zinc-800 rounded-lg p-6 h-full flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-bold text-zinc-400 uppercase tracking-wide">
          WHAT NEEDS YOU
        </h2>
        <div className="text-xs text-zinc-500 font-mono">
          {priorities.length} items
        </div>
      </div>

      <div className="space-y-3 flex-1 overflow-y-auto">
        {priorities.map((priority, index) => (
          <PriorityCard
            key={priority.id}
            priority={priority}
            index={index}
          />
        ))}
      </div>
    </section>
  );
}

function PriorityCard({ priority, index }: { priority: PriorityItem; index: number }) {
  const getUrgencyStyles = () => {
    switch (priority.urgency) {
      case 'high':
        return {
          border: 'border-rose-500/30 hover:border-rose-500/50',
          bg: 'bg-rose-500/5 hover:bg-rose-500/10',
          glow: 'shadow-rose-500/10 hover:shadow-rose-500/20',
          badge: 'bg-rose-500/20 text-rose-400'
        };
      case 'medium':
        return {
          border: 'border-amber-500/30 hover:border-amber-500/50',
          bg: 'bg-amber-500/5 hover:bg-amber-500/10',
          glow: 'shadow-amber-500/10 hover:shadow-amber-500/20',
          badge: 'bg-amber-500/20 text-amber-400'
        };
      default:
        return {
          border: 'border-zinc-700 hover:border-zinc-600',
          bg: 'bg-zinc-800/30 hover:bg-zinc-800/50',
          glow: '',
          badge: 'bg-zinc-700 text-zinc-400'
        };
    }
  };

  const styles = getUrgencyStyles();

  return (
    <div
      className={`
        p-4 rounded-lg border transition-all duration-300
        ${styles.border} ${styles.bg} ${styles.glow}
        shadow-lg animate-slide-up cursor-pointer
      `}
      style={{ animationDelay: `${index * 75}ms` }}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className={`text-xs px-2 py-0.5 rounded ${styles.badge} uppercase font-bold tracking-wide`}>
              {priority.urgency}
            </span>
            {priority.type === 'decision' && (
              <span className="text-xs text-violet-400">⚡ Decision</span>
            )}
          </div>
          <div className="font-semibold text-sm text-zinc-100 truncate">
            {priority.title}
          </div>
          <div className="text-xs text-zinc-400 mt-1 line-clamp-2">
            {priority.context}
          </div>
        </div>
        <div className="text-xs text-zinc-500 font-mono ml-3 whitespace-nowrap">
          {priority.dueIn}
        </div>
      </div>

      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 text-xs text-zinc-500">
          <span className="flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-violet-500" />
            {priority.estimatedMinutes}m
          </span>
          <span className="capitalize">{priority.domain}</span>
        </div>
        <button className="px-4 py-1.5 bg-violet-500 hover:bg-violet-600 text-white text-xs font-medium rounded transition-all hover:scale-105 active:scale-95 shadow-lg shadow-violet-500/20">
          {priority.actionLabel}
        </button>
      </div>
    </div>
  );
}
