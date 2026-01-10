"use client";

import { useEncounter } from "@/components/encounter/EncounterContext";
import { CoherenceGlobe } from "./CoherenceGlobe";
import { BiometricPanel } from "./BiometricPanel";
import { motion } from "framer-motion";

export const NerveCenter = () => {
    const { state, resolveEncounter, isResolved } = useEncounter();

    // Map Encounter State to Tactical Status
    const tacticalStatus = state === 'PRESSURE' || state === 'HIGH_COST' ? 'DRIFT' : 'NOMINAL';

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
                    <div className={`px-3 py-1 border border-opacity-30 text-[10px] font-mono tracking-widest uppercase ${tacticalStatus === 'DRIFT' ? 'border-amber-500 text-amber-500 bg-amber-500/10' : 'border-emerald-500 text-emerald-500 bg-emerald-500/10'}`}>
                        Status: {tacticalStatus === 'DRIFT' ? 'Drift Active' : 'Nominal'}
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
                    <BiometricPanel status={tacticalStatus} />
                </div>

                {/* Main Viewport: Globe & Action */}
                <div className="col-span-12 md:col-span-9 relative p-6 flex flex-col items-center justify-center">

                    {/* The Globe Container */}
                    <div className="w-full max-w-4xl aspect-video relative">
                        <CoherenceGlobe status={tacticalStatus} />
                    </div>

                    {/* Action Console (Bottom) */}
                    <div className="mt-8 flex gap-4">
                        {tacticalStatus === 'DRIFT' ? (
                            <button
                                onClick={resolveEncounter}
                                className="group relative px-8 py-4 bg-amber-500 hover:bg-amber-400 text-black font-bold tracking-[0.2em] text-sm uppercase transition-all [clip-path:polygon(0_0,100%_0,100%_70%,92%_100%,0_100%)]"
                            >
                                Execute: Re-Anchor Priorities
                                <span className="ml-4 px-1 py-0.5 bg-black/20 text-[10px] font-mono">5m</span>
                            </button>
                        ) : (
                            <button
                                onClick={resolveEncounter}
                                className="group relative px-8 py-4 bg-emerald-600 hover:bg-emerald-500 text-white font-bold tracking-[0.2em] text-sm uppercase transition-all"
                            >
                                Enter Flow State
                            </button>
                        )}
                    </div>

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
