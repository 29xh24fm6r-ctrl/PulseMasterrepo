"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import {
    Zap, Brain, ShieldCheck, Activity,
    ArrowRight, LayoutGrid, Radio, Terminal
} from "lucide-react";
import { GlassCard } from "@/components/ui/premium/GlassCard";

// Mock Data (To be replaced with real data hooks later)
const RECENT_INTEL = [
    { id: 1, type: "crm", title: "Enriched Eleanor Pena", time: "2m ago", icon: Zap, color: "text-violet-400" },
    { id: 2, type: "journal", title: "Evening Reflection Saved", time: "1h ago", icon: Brain, color: "text-emerald-400" },
    { id: 3, type: "task", title: "Completed 'Q1 Strategy'", time: "3h ago", icon: ShieldCheck, color: "text-blue-400" },
];

const container = {
    hidden: { opacity: 0 },
    show: {
        opacity: 1,
        transition: {
            staggerChildren: 0.1
        }
    }
};

const item = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0 }
};

export const CommandCenter = () => {
    return (
        <motion.div
            variants={container}
            initial="hidden"
            animate="show"
            className="grid grid-cols-1 md:grid-cols-4 gap-6 w-full max-w-6xl mx-auto px-4"
        >
            {/* 1. Active Signals (System Health) */}
            <motion.div variants={item} className="md:col-span-1">
                <GlassCard className="h-full p-6 flex flex-col justify-between group hover:border-violet-500/30 transition-all">
                    <div className="flex justify-between items-start">
                        <div className="p-2 rounded-lg bg-violet-500/10 text-violet-400">
                            <Radio className="w-5 h-5 animate-pulse" />
                        </div>
                        <div className="text-xs font-mono text-zinc-500">SYS.ONLINE</div>
                    </div>
                    <div>
                        <div className="text-3xl font-bold text-white mb-1">98%</div>
                        <div className="text-xs text-zinc-400">Cognitive Load</div>
                    </div>
                </GlassCard>
            </motion.div>

            {/* 2. Focus Core (Quick Action) */}
            <motion.div variants={item} className="md:col-span-1">
                <Link href="/tasks">
                    <GlassCard className="h-full p-6 flex flex-col justify-between group hover:border-blue-500/30 transition-all cursor-pointer">
                        <div className="flex justify-between items-start">
                            <div className="p-2 rounded-lg bg-blue-500/10 text-blue-400 group-hover:bg-blue-500/20 transition-colors">
                                <Terminal className="w-5 h-5" />
                            </div>
                            <ArrowRight className="w-4 h-4 text-zinc-600 group-hover:text-blue-400 -translate-x-2 opacity-0 group-hover:translate-x-0 group-hover:opacity-100 transition-all" />
                        </div>
                        <div>
                            <div className="text-3xl font-bold text-white mb-1">12</div>
                            <div className="text-xs text-zinc-400">Active Tasks</div>
                        </div>
                    </GlassCard>
                </Link>
            </motion.div>

            {/* 3. Cognitive Stream (Journal) */}
            <motion.div variants={item} className="md:col-span-1">
                <Link href="/journal">
                    <GlassCard className="h-full p-6 flex flex-col justify-between group hover:border-emerald-500/30 transition-all cursor-pointer">
                        <div className="flex justify-between items-start">
                            <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400 group-hover:bg-emerald-500/20 transition-colors">
                                <Brain className="w-5 h-5" />
                            </div>
                        </div>
                        <div>
                            <div className="text-xs uppercase tracking-wider text-emerald-500 mb-1">Ready</div>
                            <div className="text-sm text-zinc-200">Log Intention</div>
                        </div>
                    </GlassCard>
                </Link>
            </motion.div>

            {/* 4. CRM (Contacts) */}
            <motion.div variants={item} className="md:col-span-1">
                <Link href="/contacts">
                    <GlassCard className="h-full p-6 flex flex-col justify-between group hover:border-pink-500/30 transition-all cursor-pointer">
                        <div className="flex justify-between items-start">
                            <div className="p-2 rounded-lg bg-pink-500/10 text-pink-400 group-hover:bg-pink-500/20 transition-colors">
                                <LayoutGrid className="w-5 h-5" />
                            </div>
                        </div>
                        <div>
                            <div className="text-xs uppercase tracking-wider text-pink-500 mb-1">Network</div>
                            <div className="text-sm text-zinc-200">Access Grid</div>
                        </div>
                    </GlassCard>
                </Link>
            </motion.div>

            {/* 5. Recent Intel (Full Width Feed) */}
            <motion.div variants={item} className="md:col-span-4">
                <GlassCard className="p-6 relative overflow-hidden group">
                    <div className="flex items-center gap-3 mb-6">
                        <Activity className="w-4 h-4 text-zinc-400" />
                        <h3 className="text-xs font-bold uppercase tracking-widest text-zinc-500">Recent Intel</h3>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {RECENT_INTEL.map((intel) => (
                            <div key={intel.id} className="flex items-center gap-3 p-3 rounded-lg hover:bg-white/5 transition-colors cursor-pointer border border-transparent hover:border-white/5">
                                <div className={`p-2 rounded-full bg-zinc-900/50 border border-white/5 ${intel.color}`}>
                                    <intel.icon className="w-4 h-4" />
                                </div>
                                <div>
                                    <p className="text-sm font-medium text-zinc-200">{intel.title}</p>
                                    <p className="text-[10px] text-zinc-500">{intel.time}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </GlassCard>
            </motion.div>
        </motion.div>
    );
};
