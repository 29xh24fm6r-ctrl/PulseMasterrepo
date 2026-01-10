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
            className="grid grid-cols-1 md:grid-cols-4 gap-6 w-full max-w-5xl mx-auto px-4 mt-8"
        >
            {/* 1. System Health (Simplified) */}
            <motion.div variants={item} className="md:col-span-1">
                <GlassCard className="h-full p-6 flex flex-col justify-between group hover:bg-white/5 transition-all opacity-60 hover:opacity-100">
                    <div className="flex justify-between items-start">
                        <Activity className="w-5 h-5 text-zinc-600 group-hover:text-violet-400 transition-colors" />
                    </div>
                    <div>
                        <div className="text-2xl font-light text-zinc-300 mb-1">98%</div>
                        <div className="text-xs text-zinc-500 uppercase tracking-widest">Cognitive Load</div>
                    </div>
                </GlassCard>
            </motion.div>

            {/* 2. Focus Core (Minimalist) */}
            <motion.div variants={item} className="md:col-span-1">
                <Link href="/tasks">
                    <GlassCard className="h-full p-6 flex flex-col justify-between group hover:border-blue-500/30 transition-all cursor-pointer">
                        <div className="flex justify-between items-start">
                            <Terminal className="w-5 h-5 text-zinc-500 group-hover:text-blue-400 transition-colors" />
                            <ArrowRight className="w-4 h-4 text-zinc-700 -translate-x-2 opacity-0 group-hover:translate-x-0 group-hover:opacity-100 transition-all" />
                        </div>
                        <div>
                            <div className="text-2xl font-light text-white mb-1">12</div>
                            <div className="text-xs text-zinc-500 uppercase tracking-widest">Active Tasks</div>
                        </div>
                    </GlassCard>
                </Link>
            </motion.div>

            {/* 3. Journal (Subtle) */}
            <motion.div variants={item} className="md:col-span-1">
                <Link href="/journal">
                    <GlassCard className="h-full p-6 flex flex-col justify-between group hover:border-emerald-500/30 transition-all cursor-pointer">
                        <Brain className="w-5 h-5 text-zinc-500 group-hover:text-emerald-400 transition-colors" />
                        <div>
                            <div className="text-sm text-zinc-400 group-hover:text-emerald-200 transition-colors">Log Intention</div>
                        </div>
                    </GlassCard>
                </Link>
            </motion.div>

            {/* 4. CRM (Subtle) */}
            <motion.div variants={item} className="md:col-span-1">
                <Link href="/contacts">
                    <GlassCard className="h-full p-6 flex flex-col justify-between group hover:border-pink-500/30 transition-all cursor-pointer">
                        <LayoutGrid className="w-5 h-5 text-zinc-500 group-hover:text-pink-400 transition-colors" />
                        <div>
                            <div className="text-sm text-zinc-400 group-hover:text-pink-200 transition-colors">Access Grid</div>
                        </div>
                    </GlassCard>
                </Link>
            </motion.div>

            {/* 5. Recent Intel - REMOVED for Silence Discipline (Only Surface if Critical in v2) */}
            {/* 
                User Directive: "Target ~20–30% reduction in visible elements."
                "Limit visible widgets. Prefer conditional surfacing."
                We removed the feed entirely to reduce noise. 
                If the user wants it back, we can bring it back as a 'Satellite' in Quantum Dock.
            */}
        </motion.div>
    );
};
