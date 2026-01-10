"use client";

import { useEncounter } from "@/components/encounter/EncounterContext";
import { CoherenceGlobe } from "./CoherenceGlobe";
import { BiometricPanel } from "./BiometricPanel";
import { RightRail } from "./RightRail";
import { motion } from "framer-motion";

export const NerveCenter = () => {
    const { state, resolveEncounter, isResolved } = useEncounter();

    // Strict State Machine Mapping: CALM | DRIFT | EXECUTION | CRISIS
    const getSystemState = (s: string) => {
        if (s === 'PRESSURE') return 'DRIFT';
        if (s === 'HIGH_COST') return 'CRITICAL'; // Maps to CRISIS visual
        return 'CALM';
    };

    const systemState = getSystemState(state);
    const displayStatus = systemState === 'DRIFT' ? 'DRIFT DETECTED' : systemState === 'CALM' ? 'SYSTEMS CALM' : 'CRISIS ACTIVE';

    const statusColor = systemState === 'DRIFT' ? 'border-amber-500 text-amber-500 bg-amber-500/10' :
        systemState === 'CRITICAL' ? 'border-red-500 text-red-500 bg-red-500/10' :
            'border-emerald-500 text-emerald-500 bg-emerald-500/10';

    if (isResolved) return null;

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-black text-white font-sans overflow-hidden"
        >
            {/* Top Bar */}
            <header className="absolute top-0 left-0 right-0 h-12 border-b border-white/10 flex items-center justify-between px-6 bg-black/60 backdrop-blur-md z-20">
                <div className="flex items-center gap-3">
                    <div className="w-3 h-3 bg-orange-500 rotate-45" />
                    <div className="flex flex-col leading-none">
                        <span className="text-xs font-bold tracking-[0.2em] text-white">PULSE NERVE CENTER</span>
                        <span className="text-[9px] text-zinc-500 font-mono">SYS.VER.4.92 | ALIVE | MONITORING</span>
                    </div>
                </div>
                <div className="flex items-center gap-6">
                    <div className={`px-3 py-1 border border-opacity-30 text-[10px] font-mono tracking-widest uppercase ${statusColor}`}>
                        Status: {displayStatus}
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="text-right leading-none">
                            <div className="text-[9px] text-zinc-500 uppercase">Operator</div>
                            <div className="text-xs font-bold tracking-widest">COMMANDER</div>
                        </div>
                        <div className="w-8 h-8 bg-zinc-800 rounded-sm" />
                    </div>
                </div>
            </header>

            {/* Main Grid */}
            <div className="grid grid-cols-12 h-screen pt-12">
                {/* Left Panel: Biometrics */}
                <div className="hidden md:block md:col-span-3 border-r border-white/10 p-0">
                    <BiometricPanel status={systemState as any} />
                </div>

                {/* Main Viewport: Command Interface */}
                <div className="col-span-12 md:col-span-8 relative p-6 flex flex-col items-center justify-center">

                    {systemState === 'DRIFT' ? (
                        /* DRIFT STATE: COMMAND BLOCK */
                        <div className="w-full max-w-5xl border border-amber-500/30 bg-black/90 relative grid grid-cols-1 md:grid-cols-2">
                            {/* Corner Accents */}
                            <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-amber-500" />
                            <div className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-amber-500" />
                            <div className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 border-amber-500" />
                            <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-amber-500" />

                            {/* LEFT: Instrument Panel (Secondary) */}
                            <div className="border-r border-amber-500/10 p-6 relative flex flex-col justify-center items-center bg-zinc-900/20">
                                <div className="absolute top-4 left-4 text-[10px] text-amber-500/80 font-mono tracking-widest uppercase">
                                    System Coherence Model
                                </div>
                                <div className="w-full aspect-square max-w-[300px] opacity-80 mix-blend-screen">
                                    <CoherenceGlobe status="DRIFT" />
                                </div>
                                <div className="absolute bottom-4 right-4 text-amber-900/50 font-black text-4xl select-none">ERR</div>
                            </div>

                            {/* RIGHT: COMMAND CONSOLE (Primary) */}
                            <div className="p-8 md:p-10 flex flex-col justify-center relative">
                                {/* Context Flag */}
                                <div className="flex items-center gap-3 mb-6">
                                    <div className="w-2 h-2 bg-amber-500 rounded-full animate-pulse" />
                                    <span className="text-amber-500 font-mono text-xs tracking-[0.2em] uppercase font-bold">Drift Detected</span>
                                    <span className="ml-auto bg-amber-500 text-black text-[10px] font-bold px-2 py-0.5 tracking-widest uppercase">Priority: Alpha</span>
                                </div>

                                {/* THE DIRECTIVE */}
                                <h1 className="text-6xl md:text-7xl font-black text-white leading-[0.85] tracking-tighter uppercase mb-6">
                                    Re-Anchor<br />Priorities
                                </h1>

                                <p className="text-zinc-400 text-sm leading-relaxed mb-8 max-w-sm border-l-2 border-amber-500/30 pl-4">
                                    System coherence has dropped below nominal thresholds.
                                    Immediate intervention required to restore operational alignment.
                                </p>

                                {/* CTA */}
                                <button
                                    onClick={resolveEncounter}
                                    className="w-full group relative flex items-center justify-between px-6 py-5 bg-amber-500 hover:bg-amber-400 text-black transitions-all [clip-path:polygon(0_0,100%_0,100%_80%,95%_100%,0_100%)]"
                                >
                                    <span className="font-bold tracking-[0.2em] text-sm uppercase">Execute: Re-Anchor Priorities</span>
                                    <span className="bg-black/20 px-2 py-1 text-xs font-mono font-bold">(5m)</span>
                                </button>

                                {/* Automation Preview */}
                                <div className="mt-8 pt-6 border-t border-white/5">
                                    <div className="text-[10px] text-zinc-600 uppercase tracking-widest mb-3">Pulse will automatically:</div>
                                    <ul className="space-y-2">
                                        {['Resume Deep Work block', 'Suppress low-leverage tasks for 90m', 'Re-evaluate trajectory at 11:30'].map((item, i) => (
                                            <li key={i} className="flex items-center gap-2 text-xs text-zinc-500 font-mono">
                                                <span className="w-1 h-1 bg-zinc-700" />
                                                {item}
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            </div>
                        </div>
                    ) : (
                        /* CALM/NOMINAL STATE */
                        <div className="flex flex-col items-center">
                            <div className="w-full max-w-2xl aspect-video relative mb-8">
                                <CoherenceGlobe status="CALM" />
                            </div>
                            <button
                                onClick={resolveEncounter}
                                className="group relative px-12 py-5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold tracking-[0.2em] text-sm uppercase transition-all"
                            >
                                Enter Flow State
                            </button>
                        </div>
                    )}

                    {/* System Log Overlay */}
                    <div className="absolute bottom-6 left-6 right-6 h-32 border-t border-white/10 bg-black/80 pt-2 font-mono text-[10px] text-zinc-500 overflow-hidden hidden md:block">
                        <div className="flex items-center gap-2 text-amber-500 mb-1">
                            <span>▶</span>
                            <span>10:42:05</span>
                            <span className="text-white font-bold">RELATIONSHIP SIGNAL WEAKENING: ALEX</span>
                            <span className="ml-auto px-2 bg-amber-500 text-black">ACTION REQ</span>
                        </div>
                        <div className="flex items-center gap-2 text-zinc-600 mb-1">
                            <span>09:15:33</span>
                            <span>Cortisol spike detected during meeting block.</span>
                        </div>
                        <div className="flex items-center gap-2 text-zinc-600 mb-1">
                            <span>09:00:00</span>
                            <span>Deep work block initiated. Parameters nominal.</span>
                        </div>
                    </div>

                </div>
            </div>

            {/* CRT Effect Overlay */}
            <div className="absolute inset-0 z-50 pointer-events-none bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-[0.03]" />
            <div className="absolute inset-0 z-50 pointer-events-none bg-gradient-to-b from-transparent via-white/[0.02] to-transparent bg-[length:100%_4px]" />

        </motion.div>
    );
}
