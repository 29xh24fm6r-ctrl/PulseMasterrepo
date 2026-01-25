"use client";

import React from 'react';
import { LifeThread } from '../types/nerve-center';

interface LifeThreadsProps {
  threads: LifeThread[];
}

export function LifeThreads({ threads }: LifeThreadsProps) {
  return (
    <section className="bg-zinc-900/50 border border-zinc-800 rounded-lg p-6 h-full flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-bold text-zinc-400 uppercase tracking-wide">
          ACTIVE THREADS
        </h2>
        <div className="text-xs text-zinc-500 font-mono">
          {threads.filter(t => t.status === 'active' || t.status === 'attention').length} in motion
        </div>
      </div>

      <div className="space-y-3 flex-1 overflow-y-auto">
        {threads.map((thread, index) => (
          <ThreadCard
            key={thread.id}
            thread={thread}
            index={index}
          />
        ))}
      </div>
    </section>
  );
}

function ThreadCard({ thread, index }: { thread: LifeThread; index: number }) {
  const getStatusColor = () => {
    if (thread.status === 'thriving') return 'text-emerald-500';
    if (thread.status === 'active') return 'text-violet-500';
    return 'text-amber-500';
  };

  const getStatusBadge = () => {
    if (thread.status === 'thriving') return 'bg-emerald-500/20 text-emerald-400';
    if (thread.status === 'active') return 'bg-violet-500/20 text-violet-400';
    return 'bg-amber-500/20 text-amber-400';
  };

  const getProgressColor = () => {
    if (thread.health >= 80) return 'bg-emerald-500';
    if (thread.health >= 60) return 'bg-violet-500';
    if (thread.health >= 40) return 'bg-amber-500';
    return 'bg-rose-500';
  };

  return (
    <div
      className="
        p-4 rounded-lg border border-zinc-700 bg-zinc-800/30
        hover:border-violet-500/50 hover:bg-zinc-800/50
        transition-all duration-300 cursor-pointer
        shadow-lg hover:shadow-violet-500/10
        animate-slide-up
      "
      style={{ animationDelay: `${index * 60}ms` }}
    >
      <div className="flex items-start justify-between mb-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className={`text-xs font-bold ${getStatusColor()}`}>
              {thread.health}
            </span>
            <span className={`text-xs px-2 py-0.5 rounded ${getStatusBadge()} uppercase font-bold tracking-wide`}>
              {thread.status}
            </span>
          </div>
          <div className="font-semibold text-sm text-zinc-100 mb-1 truncate">
            {thread.title}
          </div>
          <div className="text-xs text-zinc-400 line-clamp-2">
            {thread.storyLine}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2 mt-3 mb-2">
        <div className="flex-1 h-1.5 bg-zinc-700 rounded-full overflow-hidden">
          <div
            className={`h-full transition-all duration-1000 ${getProgressColor()} shadow-lg`}
            style={{ width: `${thread.progress * 100}%` }}
          />
        </div>
        <div className="text-xs text-zinc-500 font-mono tabular-nums w-10 text-right">
          {Math.round(thread.progress * 100)}%
        </div>
      </div>

      <div className="flex items-center justify-between text-xs">
        <div className="text-zinc-500">
          Next: <span className="text-zinc-400 font-medium">{thread.nextAction}</span>
        </div>
        <div className="flex items-center gap-3 text-zinc-500">
          <span>{thread.itemCount} items</span>
          <span className="font-mono">{thread.lastActivity}</span>
        </div>
      </div>

      {thread.dueIn === 'overdue' && (
        <div className="mt-2 px-2 py-1 bg-rose-500/10 border border-rose-500/30 rounded text-xs text-rose-400 font-semibold">
          ⚠️ OVERDUE
        </div>
      )}
    </div>
  );
}
