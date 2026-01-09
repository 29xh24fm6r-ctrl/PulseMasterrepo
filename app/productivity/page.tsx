"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Space_Grotesk } from "next/font/google";
import { Zap, Bell, Settings } from "lucide-react";
import { AnimatePresence } from "framer-motion";

// Clean Component Imports
import { CinematicBackground } from "@/components/ui/premium/CinematicBackground";
import { DigitalButlerView } from "@/components/ui/premium/DigitalButlerView";
import { FlowEngineView } from "@/components/ui/premium/FlowEngineView";

const spaceGrotesk = Space_Grotesk({ subsets: ["latin"] });

function ProductivityContent() {
  const searchParams = useSearchParams();
  const initialMode = searchParams.get("mode") === "flow" ? "flow" : "command";

  // Mode: 'command' (Butler) <-> 'flow' (Engine)
  const [mode, setMode] = useState<"command" | "flow">(initialMode);

  // Timer State (Lifted up to persist across mode switches)
  const [timerActive, setTimerActive] = useState(false);
  const [timeLeft, setTimeLeft] = useState(25 * 60);

  // Deep Link Handling
  useEffect(() => {
    const paramMode = searchParams.get("mode");
    if (paramMode === "flow" || paramMode === "command") {
      setMode(paramMode);
    }

    if (searchParams.get("autoStart") === "true") {
      setTimerActive(true);
    }
  }, [searchParams]);

  // Timer Logic
  useEffect(() => {
    let interval: any;
    if (timerActive && timeLeft > 0) {
      interval = setInterval(() => setTimeLeft((t) => t - 1), 1000);
    } else if (timeLeft === 0) setTimerActive(false);
    return () => clearInterval(interval);
  }, [timerActive, timeLeft]);

  return (
    <div className={`h-screen flex flex-col bg-[#0a070e] text-white selection:bg-[#7f13ec]/30 overflow-hidden ${spaceGrotesk.className}`}>

      {/* Living Cinematic Background */}
      <CinematicBackground />

      {/* Header (Command Bar) */}
      <header className="flex-none flex items-center justify-between px-6 py-4 bg-white/5 backdrop-blur-2xl border-b border-white/5 z-50">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-3">
            <div className="size-8 bg-[#7f13ec] rounded-lg flex items-center justify-center shadow-[0_0_20px_rgba(127,19,236,0.4)]">
              <Zap className="size-5 text-white fill-white" />
            </div>
            <h2 className="text-lg font-bold tracking-[0.2em] uppercase opacity-80 hidden md:block">Pulse OS</h2>
          </div>

          {/* Mode Switcher */}
          <div className="flex bg-black/40 border border-white/10 rounded-lg p-1 gap-1">
            <button
              onClick={() => setMode("command")}
              className={`px-4 py-1.5 rounded-md text-[10px] font-bold uppercase tracking-widest transition-all ${mode === "command" ? "bg-[#7f13ec] text-white shadow-lg shadow-[#7f13ec]/20" : "text-white/40 hover:text-white"
                }`}
            >
              Command
            </button>
            <button
              onClick={() => setMode("flow")}
              className={`px-4 py-1.5 rounded-md text-[10px] font-bold uppercase tracking-widest transition-all ${mode === "flow" ? "bg-[#7f13ec] text-white shadow-lg shadow-[#7f13ec]/20" : "text-white/40 hover:text-white"
                }`}
            >
              Flow
            </button>
          </div>
        </div>

        <div className="flex items-center gap-4">
          {/* System Status Indicators */}
          <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/5 border border-white/5">
            <div className={`size-1.5 rounded-full ${timerActive ? 'bg-[#7f13ec] animate-ping' : 'bg-green-500'}`} />
            <span className="text-[10px] text-white/50 font-bold tracking-tighter uppercase">
              {timerActive ? "FOCUS_ACTIVE" : "SYS_READY"}
            </span>
          </div>

          <button className="size-9 rounded-lg border border-white/10 flex items-center justify-center hover:bg-white/5 text-white/60 hover:text-white transition-colors">
            <Bell className="size-4" />
          </button>
          <button className="size-9 rounded-lg border border-white/10 flex items-center justify-center hover:bg-white/5 text-white/60 hover:text-white transition-colors">
            <Settings className="size-4" />
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 relative z-10 p-6 overflow-hidden">
        <AnimatePresence mode="wait">
          {mode === "command" ? (
            <div key="command" className="h-full animate-in fade-in slide-in-from-bottom-4 duration-500">
              <DigitalButlerView />
            </div>
          ) : (
            <div key="flow" className="h-full animate-in fade-in slide-in-from-bottom-4 duration-500">
              <FlowEngineView
                timerActive={timerActive}
                timeLeft={timeLeft}
                setTimerActive={setTimerActive}
                setTimeLeft={setTimeLeft}
              />
            </div>
          )}
        </AnimatePresence>
      </main>

      {/* Footer Status Line */}
      <footer className="flex-none h-8 border-t border-white/5 bg-black/20 backdrop-blur-md px-6 flex items-center justify-between text-[9px] font-bold text-white/20 uppercase tracking-[0.2em] relative z-50">
        <div className="flex gap-6">
          <span>Core: 4.2.0</span>
          <span>Uptime: 99.9%</span>
        </div>
        <div className="flex gap-6">
          <span>Memory: 12%</span>
          <span>Lat: 22ms</span>
        </div>
      </footer>

    </div>
  );
}

export default function ProductivityPage() {
  return (
    <Suspense fallback={<div className="h-screen bg-[#0a070e] flex items-center justify-center text-white/30 text-xs tracking-widest uppercase animate-pulse">Initializing Pulse OS...</div>}>
      <ProductivityContent />
    </Suspense>
  );
}
