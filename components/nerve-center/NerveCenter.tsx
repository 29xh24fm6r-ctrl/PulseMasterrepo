"use client";

import { motion } from "framer-motion";
import { LivingAtmosphere } from "./LivingAtmosphere";
import { RoomsNavigation } from "./RoomsNavigation";
import { useEncounter } from "@/components/encounter/EncounterContext";

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
        <div className="relative w-full h-screen flex flex-col overflow-hidden bg-black font-sans selection:bg-amber-500/30">
            {/* 1. LIVING ATMOSPHERE (Background) */}
            <LivingAtmosphere status={systemState as any} />

            {/* 2. THE ESSENTIAL TRUTH (Center) */}
            <main className="flex-1 flex flex-col items-center justify-center relative z-10 px-6">

                {/* Status Sentence */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 1, delay: 0.2 }}
                    className="text-center max-w-2xl"
                >
                    {systemState === 'CALM' && (
                        <h1 className="text-3xl md:text-4xl lg:text-5xl font-light text-white/90 leading-tight tracking-tight">
                            You are flowing well today. <br />
                            <span className="text-white/50">The afternoon is wide open.</span>
                        </h1>
                    )}

                    {systemState === 'DRIFT' && (
                        <>
                            <h1 className="text-3xl md:text-4xl lg:text-5xl font-light text-white/90 leading-tight tracking-tight mb-12">
                                Things are getting heavy. <br />
                                <span className="text-white/50">Let's simplify.</span>
                            </h1>

                            {/* Gentle Command Card */}
                            <motion.div
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                className="bg-white/5 backdrop-blur-xl border border-white/10 p-8 rounded-2xl max-w-lg mx-auto text-left shadow-2xl"
                            >
                                <div className="text-xs uppercase tracking-[0.2em] text-indigo-400 mb-4 font-bold">Suggestion</div>
                                <h2 className="text-2xl text-white font-medium mb-2">Re-Anchor Priorities</h2>
                                <p className="text-zinc-400 text-sm mb-8 leading-relaxed">
                                    You’ve been distracted for 20 minutes. Shall we get back to Deep Work?
                                </p>
                                <button
                                    onClick={resolveEncounter}
                                    className="w-full py-4 bg-white text-black font-medium text-sm tracking-widest uppercase hover:bg-indigo-50 transition-colors rounded-lg"
                                >
                                    Let's do it
                                </button>
                            </motion.div>
                        </>
                    )}

                    {(systemState === 'CRITICAL' || systemState === 'CRISIS') && (
                        <h1 className="text-3xl md:text-4xl font-light text-red-200/90 leading-tight">
                            Rest is your priority tonight.
                        </h1>
                    )}
                </motion.div>

            </main>

            {/* 3. ROOMS OF LIFE (Navigation) */}
            <RoomsNavigation />
        </div>
    );
}
