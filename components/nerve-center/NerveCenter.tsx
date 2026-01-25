"use client";

import React from 'react';
import { useLifeState } from './hooks/useLifeState';
import { usePriorities } from './hooks/usePriorities';
import { useThreads } from './hooks/useThreads';
import { usePulseMind } from './hooks/usePulseMind';
import { useTimeHorizon } from './hooks/useTimeHorizon';
import { LifeVitalSigns } from './components/LifeVitalSigns';
import { WhatNeedsYou } from './components/WhatNeedsYou';
import { LifeThreads } from './components/LifeThreads';
import { PulseMind } from './components/PulseMind';
import { TimeHorizon } from './components/TimeHorizon';

export function NerveCenter() {
  const { lifeState, domains, isLoading: lifeStateLoading } = useLifeState();
  const { priorities, isLoading: prioritiesLoading } = usePriorities();
  const { threads, isLoading: threadsLoading } = useThreads();
  const { pulseMind, isLoading: pulseMindLoading } = usePulseMind();
  const { timeHorizon, isLoading: timeHorizonLoading } = useTimeHorizon();

  const isLoading =
    lifeStateLoading ||
    prioritiesLoading ||
    threadsLoading ||
    pulseMindLoading ||
    timeHorizonLoading;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#09090b] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="relative w-16 h-16">
            <div className="absolute inset-0 rounded-full bg-violet-500 opacity-20 animate-ping" />
            <div className="absolute inset-2 rounded-full bg-violet-500 animate-pulse" />
          </div>
          <div className="text-violet-500 text-lg font-mono animate-pulse">
            Initializing Nerve Center...
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#09090b] text-zinc-100 font-sans antialiased">
      <div className="max-w-[1800px] mx-auto p-6 space-y-6">

        {/* Header */}
        <header className="flex items-center justify-between pb-4 border-b border-zinc-800 animate-fade-in">
          <div>
            <h1 className="text-3xl font-bold text-zinc-100 tracking-tight">
              NERVE CENTER
            </h1>
            <p className="text-sm text-zinc-400 font-mono mt-1">
              {new Date().toLocaleDateString('en-US', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric'
              })}
            </p>
          </div>
        </header>

        {/* Life Vital Signs */}
        <LifeVitalSigns
          domains={domains}
          score={lifeState.score}
          level={lifeState.level}
        />

        {/* Main Grid Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - What Needs You */}
          <WhatNeedsYou priorities={priorities} />

          {/* Middle Column - Life Threads */}
          <LifeThreads threads={threads} />

          {/* Right Column - Pulse Mind & Time Horizon */}
          <div className="space-y-6">
            <PulseMind pulseMind={pulseMind} />
            <TimeHorizon timeHorizon={timeHorizon} />
          </div>
        </div>

        {/* Bottom Stats */}
        <footer className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard
            value={lifeState.activeItems}
            label="Active Items"
            color="text-zinc-100"
            index={0}
          />
          <StatCard
            value={lifeState.pendingDecisions}
            label="Pending Decisions"
            color="text-zinc-100"
            index={1}
          />
          <StatCard
            value={lifeState.inMotion}
            label="In Motion"
            color="text-emerald-500"
            index={2}
          />
          <StatCard
            value={`${lifeState.weekLoad}%`}
            label="Week Load"
            color="text-violet-500"
            index={3}
          />
        </footer>

      </div>
    </div>
  );
}

function StatCard({
  value,
  label,
  color,
  index
}: {
  value: string | number;
  label: string;
  color: string;
  index: number;
}) {
  return (
    <div
      className="bg-zinc-900/30 border border-zinc-800 rounded-lg p-4 hover:bg-zinc-900/50 hover:border-zinc-700 transition-all animate-slide-up"
      style={{ animationDelay: `${index * 75}ms` }}
    >
      <div className={`text-2xl font-bold ${color} tabular-nums`}>{value}</div>
      <div className="text-xs text-zinc-400 uppercase tracking-wide mt-1">{label}</div>
    </div>
  );
}
