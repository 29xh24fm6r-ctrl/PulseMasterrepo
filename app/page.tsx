'use client';

import React, { useEffect, useState } from 'react';
import { Sidebar } from '@/components/dashboard/Sidebar';
import { PulseSystemStrip } from '@/components/dashboard/PulseSystemStrip';
import { LifeStateCanvas } from '@/components/dashboard/LifeStateCanvas';
import { ExecutionLane } from '@/components/dashboard/ExecutionLane';
import { useNerveCenterState } from '@/components/dashboard/nerve/useNerveCenterState';
import { ZoneFocusPanel } from '@/components/dashboard/nerve/ZoneFocusPanel';
import CookingFocusMode from '@/components/chef/CookingFocusMode';

export default function Home() {
  const [mounted, setMounted] = useState(false);

  // Phase 3: Centralized State Hook
  const { state, loading, activeSystemId, setActiveSystemId } = useNerveCenterState();

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  // Loading State (Subtle)
  if (loading || !state) {
    return <div className="w-full h-screen bg-[#050505] flex items-center justify-center text-white/20 text-xs tracking-widest uppercase">Initializing Cortex...</div>;
  }

  return (
    <div className="flex w-full h-screen bg-[#050505] text-slate-200 overflow-hidden font-sans selection:bg-violet-500/30">

      {/* 4. OVERLAYS */}
      <ZoneFocusPanel
        isOpen={!!activeSystemId}
        systemId={activeSystemId}
        systemState={activeSystemId ? state.systems[activeSystemId] : null}
        onClose={() => setActiveSystemId(null)}
      />

      <CookingFocusMode />

      {/* 2. CANONICAL LAYOUT */}

      {/* Left Nav (static) */}
      <Sidebar />

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col h-screen relative">

        {/* Top Bar Area */}
        <div className="h-16 flex items-center justify-between px-8 border-b border-white/5 bg-black/20 z-20">
          <div className="flex items-center gap-4 text-white/20">
            <div className="w-4 h-4 rounded-full border border-white/20" />
            <span className="text-xs tracking-widest font-mono uppercase">Pulse OS v5.0 // Nerve Center</span>
          </div>
          {/* Simple Search Placeholder */}
          <div className="w-64 h-8 rounded-lg bg-white/5 border border-white/5" />
        </div>

        {/* Pulse System Strip (State Driven) */}
        <PulseSystemStrip
          systems={state.systems}
          activeSystemId={activeSystemId}
          onSystemClick={setActiveSystemId}
        />

        {/* Primary Workspace */}
        <div className="flex flex-1 min-h-0 px-8 pb-8 gap-8">

          {/* Life State Canvas (Primary View) */}
          <LifeStateCanvas state={state} />

          {/* Execution Lane (Secondary) */}
          <ExecutionLane items={state.execution_lane} />

        </div>

      </main>

    </div>
  );
}
