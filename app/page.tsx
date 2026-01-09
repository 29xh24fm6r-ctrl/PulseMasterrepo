"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  Zap, Brain, Sparkles, Command,
  Activity, Calendar, Search, ArrowRight,
  ShieldCheck, Wifi
} from "lucide-react";
import { CinematicBackground } from "@/components/ui/premium/CinematicBackground";
import { GlassCard } from "@/components/ui/premium/GlassCard";

// Mock Data
const RECENT_INTEL = [
  { id: 1, type: "crm", title: "Enriched Eleanor Pena", time: "2m ago", icon: Sparkles, color: "text-violet-400" },
  { id: 2, type: "journal", title: "Evening Reflection Saved", time: "1h ago", icon: Brain, color: "text-emerald-400" },
  { id: 3, type: "task", title: "Completed 'Q1 Strategy'", time: "3h ago", icon: ShieldCheck, color: "text-blue-400" },
];

export default function Home() {
  const [time, setTime] = useState(new Date());
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Time formatting
  const timeString = time.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
  const dateString = time.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });

  return (
    <div className="relative min-h-screen text-white font-sans selection:bg-cyan-500/30 overflow-hidden">
      <CinematicBackground />

      {/* Main Interface Layer */}
      <div className="relative z-10 min-h-screen flex flex-col p-6 md:p-12">

        {/* Top HUD */}
        <header className="flex justify-between items-start animate-in fade-in slide-in-from-top-10 duration-1000">
          <div className="flex flex-col">
            <div className="flex items-center gap-2 mb-1">
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-xs uppercase tracking-[0.2em] text-emerald-500/80 font-semibold">System Online</span>
            </div>
            <div className="flex items-center gap-2 text-zinc-500 text-xs uppercase tracking-widest">
              <Wifi className="w-3 h-3" />
              <span>Pulse OS v4.2</span>
            </div>
          </div>
          <div>
            <Link href="/settings" className="p-2 rounded-full hover:bg-white/5 transition-colors text-zinc-400 hover:text-white">
              <ShieldCheck className="w-5 h-5" />
            </Link>
          </div>
        </header>

        {/* Center Command */}
        <main className="flex-1 flex flex-col justify-center max-w-5xl mx-auto w-full">

          {/* Hero Section */}
          <div className="text-center mb-16 space-y-6">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.8, ease: "easeOut" }}
            >
              <h1 className="text-7xl md:text-9xl font-bold tracking-tight text-white mb-2" style={{ textShadow: "0 0 40px rgba(255,255,255,0.1)" }}>
                {timeString}
              </h1>
              <p className="text-xl text-zinc-400 uppercase tracking-widest font-light">{dateString}</p>
            </motion.div>


          </div>

          {/* Holographic Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

            {/* Card 1: Network Intelligence */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}>
              <Link href="/contacts">
                <GlassCard className="h-full p-6 group hover:border-violet-500/40 transition-all cursor-pointer">
                  <div className="flex items-center justify-between mb-8">
                    <div className="p-3 bg-violet-500/10 rounded-xl text-violet-400 group-hover:scale-110 transition-transform duration-300">
                      <Sparkles className="w-6 h-6" />
                    </div>
                    <ArrowRight className="w-5 h-5 text-zinc-600 group-hover:text-white transition-colors -translate-x-2 opacity-0 group-hover:translate-x-0 group-hover:opacity-100" />
                  </div>
                  <h3 className="text-2xl font-semibold mb-2 group-hover:text-violet-300 transition-colors">Network<br />Intelligence</h3>
                  <p className="text-sm text-zinc-400">Enrich contacts with God Mode.</p>
                </GlassCard>
              </Link>
            </motion.div>

            {/* Card 2: Cognitive Stream */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }}>
              <Link href="/journal">
                <GlassCard className="h-full p-6 group hover:border-emerald-500/40 transition-all cursor-pointer">
                  <div className="flex items-center justify-between mb-8">
                    <div className="p-3 bg-emerald-500/10 rounded-xl text-emerald-400 group-hover:scale-110 transition-transform duration-300">
                      <Brain className="w-6 h-6" />
                    </div>
                    <ArrowRight className="w-5 h-5 text-zinc-600 group-hover:text-white transition-colors -translate-x-2 opacity-0 group-hover:translate-x-0 group-hover:opacity-100" />
                  </div>
                  <h3 className="text-2xl font-semibold mb-2 group-hover:text-emerald-300 transition-colors">Cognitive<br />Stream</h3>
                  <p className="text-sm text-zinc-400">Reflect with neural AI insights.</p>
                </GlassCard>
              </Link>
            </motion.div>

            {/* Card 3: Recent Activity (Mini HUD) */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.7 }}>
              <GlassCard className="h-full p-6 relative overflow-hidden">
                <div className="absolute top-0 right-0 p-4 opacity-50">
                  <Activity className="w-12 h-12 text-zinc-800" />
                </div>
                <h3 className="text-zinc-400 text-xs font-bold uppercase tracking-widest mb-6">Recent Intel</h3>
                <div className="space-y-4">
                  {RECENT_INTEL.map(item => (
                    <div key={item.id} className="flex items-center gap-3 group cursor-pointer">
                      <div className={`p-1.5 rounded-full bg-zinc-900 border border-white/5 ${item.color}`}>
                        <item.icon className="w-3 h-3" />
                      </div>
                      <div>
                        <p className="text-sm text-zinc-200 group-hover:text-white transition-colors">{item.title}</p>
                        <p className="text-[10px] text-zinc-500">{item.time}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </GlassCard>
            </motion.div>

          </div>
        </main>

        {/* Footer Status */}
        <footer className="py-6 flex justify-between items-end opacity-50 hover:opacity-100 transition-opacity">
          <div className="flex gap-4 text-xs text-zinc-500 font-mono">
            <span>CPU: 12%</span>
            <span>MEM: 4.2GB</span>
            <span>LAT: 24ms</span>
          </div>
        </footer>
      </div>
    </div>
  );
}
