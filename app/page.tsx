'use client';

import React, { useEffect, useState } from 'react';
import { Sidebar } from '@/components/dashboard/Sidebar';
import { PulseSystemStrip } from '@/components/dashboard/PulseSystemStrip';
import { LifeStateCanvas } from '@/components/dashboard/LifeStateCanvas';
import { ExecutionLane } from '@/components/dashboard/ExecutionLane';

export default function Home() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null; // Prevent hydration mismatch on complex visuals

  return (
    <div className="flex w-full h-screen bg-[#050505] text-slate-200 overflow-hidden font-sans selection:bg-violet-500/30">

      {/* 2. CANONICAL LAYOUT */}

      {/* Left Nav (static) */}
      <Sidebar />

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col h-screen relative">

        {/* Top Bar Area (Placeholder for Search/Ask Pulse per spec section 2) */}
        <div className="h-16 flex items-center justify-between px-8 border-b border-white/5 bg-black/20 z-20">
          <div className="flex items-center gap-4 text-white/20">
            <div className="w-4 h-4 rounded-full border border-white/20" />
            <span className="text-xs tracking-widest font-mono uppercase">Pulse OS v5.0 // Nerve Center</span>
          </div>
          {/* Simple Search Placeholder */}
          <div className="w-64 h-8 rounded-lg bg-white/5 border border-white/5" />
        </div>

        {/* Pulse System Strip (Mandatory) */}
        <PulseSystemStrip />

        {/* Primary Workspace: Canvas + Execution Lane */}
        <div className="flex flex-1 min-h-0 px-8 pb-8 gap-8">

          {/* Life State Canvas (Primary View) */}
          <LifeStateCanvas />

          {/* Execution Lane (Secondary) */}
          <ExecutionLane />

        </div>

      </main>

    </div>
  );
}
