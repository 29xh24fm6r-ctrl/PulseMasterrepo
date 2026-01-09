"use client";

import React from "react";
import { motion } from "framer-motion";
import {
    RotateCcw, Pause, Play, SkipForward,
    Activity, LayoutGrid, Clock, CheckCircle,
    Flame, MoreVertical
} from "lucide-react";

// Mock Data for Flow View
const MOCK_TASKS = [
    { id: "1", title: "Neural Interface Design", desc: "Optimizing vertex shaders for the flow engine visualisation module.", progress: 65, priority: "High Priority" },
    { id: "2", title: "System Audit_v4", desc: "Reviewing telemetry logs from the previous focus session.", progress: 30, priority: "Ongoing" },
];

export function FlowEngineView({ timerActive, timeLeft, setTimerActive, setTimeLeft }: any) {
    const timerProgress = 1 - (timeLeft / (25 * 60));

    const formatTime = (seconds: number) => {
        const m = Math.floor(seconds / 60);
        const s = seconds % 60;
        return {
            m: m.toString().padStart(2, "0"),
            s: s.toString().padStart(2, "0")
        };
    };
    const { m, s } = formatTime(timeLeft);

    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="h-full grid grid-cols-12 gap-8"
        >
            {/* Left Column (Main) */}
            <div className="col-span-12 lg:col-span-8 flex flex-col gap-6">

                {/* Page Heading */}
                <div className="flex flex-wrap justify-between items-end gap-3 bg-white/5 backdrop-blur-xl border border-white/10 p-8 rounded-2xl relative overflow-hidden shadow-2xl">
                    <div className="flex flex-col gap-1 relative z-10">
                        <p className="text-white text-5xl font-light leading-tight tracking-[-0.05em] uppercase">ENGINE_ACTIVE</p>
                        <p className="text-[#7f13ec] text-sm font-medium leading-normal tracking-[0.3em] uppercase">System status: Optimal flow state detected</p>
                    </div>
                    <div className="flex gap-3 relative z-10">
                        <button className="flex min-w-[120px] cursor-pointer items-center justify-center overflow-hidden rounded-lg h-12 px-6 bg-[#7f13ec] text-white text-sm font-bold leading-normal tracking-widest uppercase hover:bg-[#7f13ec]/80 transition-all shadow-lg shadow-[#7f13ec]/20">
                            <span>Boost Engine</span>
                        </button>
                    </div>
                    <div className="absolute top-0 right-0 p-4 opacity-10">
                        <Activity className="size-[120px]" />
                    </div>
                </div>

                {/* Visual Timer */}
                <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-8 flex flex-col items-center justify-center relative min-h-[350px] shadow-2xl flex-1">
                    <div className="relative size-64 flex items-center justify-center">
                        <svg className="absolute inset-0 size-full -rotate-90">
                            <circle cx="128" cy="128" fill="transparent" r="110" stroke="rgba(255,255,255,0.05)" strokeWidth="8" />
                            <motion.circle
                                cx="128" cy="128"
                                fill="transparent"
                                r="110"
                                stroke="#7f13ec"
                                strokeDasharray="690"
                                strokeDashoffset={690 * (1 - timerProgress)}
                                strokeLinecap="round"
                                strokeWidth="10"
                                initial={{ strokeDashoffset: 690 }}
                                animate={{ strokeDashoffset: 690 * timerProgress }}
                                className="drop-shadow-[0_0_10px_rgba(127,19,236,0.5)]"
                            />
                        </svg>
                        <div className="flex flex-col items-center gap-1 z-10 absolute">
                            <div className="flex items-baseline text-white">
                                <span className="text-6xl font-bold tracking-tighter tabular-nums">{m}</span>
                                <span className="text-3xl font-light text-[#7f13ec] mx-2 animate-pulse">:</span>
                                <span className="text-6xl font-bold tracking-tighter tabular-nums">{s}</span>
                            </div>
                            <p className="text-white/40 text-xs font-bold tracking-[0.4em] uppercase">Deep Focus</p>
                        </div>
                        {timerActive && (
                            <div className="absolute inset-0 border-2 border-[#7f13ec]/20 rounded-full animate-ping opacity-20" />
                        )}
                    </div>
                    <div className="mt-8 flex gap-4 z-20">
                        <button
                            onClick={() => { setTimerActive(false); setTimeLeft(25 * 60); }}
                            className="size-12 rounded-full border border-white/10 bg-white/5 flex items-center justify-center hover:bg-[#7f13ec]/20 transition-all text-white"
                        >
                            <RotateCcw className="size-5" />
                        </button>
                        <button
                            onClick={() => setTimerActive(!timerActive)}
                            className="size-16 rounded-full bg-[#7f13ec] flex items-center justify-center hover:scale-105 transition-all shadow-xl shadow-[#7f13ec]/40 text-white"
                        >
                            {timerActive ? <Pause className="size-8 fill-current" /> : <Play className="size-8 fill-current ml-1" />}
                        </button>
                        <button className="size-12 rounded-full border border-white/10 bg-white/5 flex items-center justify-center hover:bg-[#7f13ec]/20 transition-all text-white">
                            <SkipForward className="size-5" />
                        </button>
                    </div>
                </div>

                {/* Task Matrix */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {MOCK_TASKS.map((task, i) => (
                        <div key={task.id} className={`bg-white/5 backdrop-blur-xl border border-white/10 shadow-2xl p-6 rounded-xl hover:border-[#7f13ec]/50 transition-all group cursor-pointer ${i === 1 ? "border-l-4 border-l-[#7f13ec]/50" : ""}`}>
                            <div className="flex justify-between items-start mb-4">
                                <div className={`px-2 py-1 rounded ${i === 0 ? "bg-[#7f13ec]/20 text-[#7f13ec]" : "bg-white/5 text-white/40"} text-[10px] font-bold uppercase tracking-widest`}>
                                    {task.priority}
                                </div>
                                <MoreVertical className="text-white/20 group-hover:text-[#7f13ec] transition-colors size-5" />
                            </div>
                            <h3 className="text-lg font-bold mb-2">{task.title}</h3>
                            <p className="text-white/50 text-sm mb-6 line-clamp-2">{task.desc}</p>
                            <div className="flex items-center gap-2">
                                <div className="flex-1 h-1 bg-white/10 rounded-full overflow-hidden">
                                    <div className={`h-full ${i === 0 ? "bg-[#7f13ec]" : "bg-[#7f13ec]/40"}`} style={{ width: `${task.progress}%` }} />
                                </div>
                                <span className="text-[10px] font-bold text-white/40">{task.progress}%</span>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Right Column (Metrics) */}
            <div className="col-span-12 lg:col-span-4 flex flex-col gap-6">
                {/* Flow Gauge */}
                <div className="bg-white/5 backdrop-blur-xl border border-white/10 shadow-2xl rounded-2xl p-6 border-t-2 border-t-[#7f13ec]/40">
                    <div className="flex flex-col gap-6">
                        <div className="flex flex-col gap-1">
                            <p className="text-white/40 text-[10px] font-bold uppercase tracking-[0.3em]">Telemetry_Realtime</p>
                            <h3 className="text-xl font-bold uppercase tracking-tight">Flow Prediction</h3>
                        </div>
                        <div className="relative h-48 w-full bg-white/5 rounded-xl border border-white/10 overflow-hidden flex items-end">
                            {/* Bar */}
                            <div className="w-full bg-gradient-to-t from-[#7f13ec]/80 to-[#7f13ec] relative shadow-[0_-10px_30px_rgba(127,19,236,0.6)]" style={{ height: "88%" }}>
                                <div className="absolute top-0 left-0 w-full h-8 bg-white/20 blur-sm" />
                                <div className="absolute top-4 left-4">
                                    <span className="text-3xl font-black text-white italic">88%</span>
                                </div>
                            </div>
                            {/* Grid Lines */}
                            <div className="absolute inset-0 pointer-events-none opacity-10 flex flex-col justify-between p-4">
                                {[1, 2, 3].map(j => <div key={j} className="border-b border-white w-full" />)}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Stats */}
                <div className="bg-white/5 backdrop-blur-xl border border-white/10 shadow-2xl rounded-2xl p-6">
                    <h3 className="text-sm font-bold uppercase tracking-widest mb-4 flex items-center gap-2">
                        <LayoutGrid className="text-[#7f13ec] size-5" /> Session Logs
                    </h3>
                    <div className="space-y-4">
                        <div className="flex items-center gap-4 p-3 rounded-lg bg-white/5 border border-white/5">
                            <div className="size-10 rounded-lg bg-[#7f13ec]/20 flex items-center justify-center">
                                <Clock className="size-6 text-[#7f13ec]" />
                            </div>
                            <div>
                                <p className="text-xs text-white/40 font-bold uppercase">Time Invested</p>
                                <p className="text-lg font-bold">4.2 <span className="text-xs font-normal opacity-50">hrs</span></p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Streak */}
                <div className="bg-white/5 backdrop-blur-xl border border-white/10 shadow-2xl rounded-2xl p-6 relative overflow-hidden group">
                    <div className="absolute -right-4 -bottom-4 opacity-5 group-hover:scale-110 transition-transform duration-700">
                        <Flame className="size-[120px]" />
                    </div>
                    <h3 className="text-xs font-bold uppercase tracking-widest mb-4">Focus_Streak</h3>
                    <div className="flex gap-2">
                        {['M', 'T', 'W'].map(d => (
                            <div key={d} className="size-8 rounded bg-[#7f13ec] flex items-center justify-center text-[10px] font-bold shadow-lg shadow-[#7f13ec]/40">{d}</div>
                        ))}
                        {['T', 'F', 'S', 'S'].map(d => (
                            <div key={d} className="size-8 rounded bg-white/10 flex items-center justify-center text-[10px] font-bold text-white/20">{d}</div>
                        ))}
                    </div>
                </div>

            </div>
        </motion.div>
    );
}
