"use client";

import { motion } from "framer-motion";
import { useEncounter } from "@/components/encounter/EncounterContext";
import { AuroraBackground } from "@/components/nerve-center/AuroraBackground";
import { FocusHero } from "@/components/nerve-center/FocusHero";
import { VitalGauge } from "@/components/nerve-center/VitalGauge";
import { PrismDock } from "@/components/nerve-center/PrismDock";
import { PrismCard } from "@/components/nerve-center/PrismCard";
import { Activity, Battery, Zap } from "lucide-react";

export const CommandCenter = () => {
    const { isResolved } = useEncounter();

    // The Dashboard is ALWAYS visible in v6.0 (No more "Encounter" blocking it, it IS the encounter)
    // We remove the if (isResolved) check to allow the dashboard to be the primary view.
    // Ideally, the "Encounter" state simply modifies the content of the FocusHero.

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="relative w-full h-screen bg-black text-white font-sans overflow-hidden"
        >
            {/* 1. BACKGROUND */}
            <AuroraBackground />

            {/* 2. THE DASHBOARD (Bento Grid) */}
            <div className="relative z-10 w-full h-full max-w-7xl mx-auto p-6 md:p-12 flex flex-col gap-6">

                {/* TOP BAR (Context) */}
                <div className="flex justify-between items-center opacity-80 mb-4">
                    <div className="text-xs font-mono tracking-widest text-white/50">SATURDAY, JAN 10</div>
                    <div className="text-xs font-mono tracking-widest text-white/50">PULSE v6.0 // PRISM</div>
                </div>

                {/* MAIN GRID */}
                <div className="grid grid-cols-1 md:grid-cols-12 gap-6 h-[60vh] md:h-[65vh]">

                    {/* HERO FOCUS (Main Activity) - Spans 8 cols */}
                    <div className="col-span-1 md:col-span-8 h-full">
                        <FocusHero />
                    </div>

                    {/* RIGHT COLUMN (Vitals & Quick Stats) - Spans 4 cols */}
                    <div className="col-span-1 md:col-span-4 h-full flex flex-col gap-6">

                        {/* Vitals Row */}
                        <PrismCard className="flex-1 p-6 flex flex-col items-center justify-center gap-6">
                            <h3 className="text-xs font-bold uppercase tracking-widest text-white/40 w-full text-center">Live Telemetry</h3>
                            <div className="flex justify-center flex-wrap gap-4">
                                <VitalGauge label="Energy" value={82} color="#d97706" icon={Battery} />
                                <VitalGauge label="Flow" value={64} color="#7c3aed" icon={Zap} />
                            </div>
                        </PrismCard>

                        {/* Recent Activity / Steps (Placeholder for future widgets) */}
                        <PrismCard className="flex-1 p-6">
                            <h3 className="text-xs font-bold uppercase tracking-widest text-white/40 mb-4">Active Steps</h3>
                            <div className="flex flex-col gap-3">
                                {[1, 2, 3].map((i) => (
                                    <div key={i} className="flex items-center gap-3 p-3 rounded-xl bg-white/5 hover:bg-white/10 transition-colors cursor-pointer group">
                                        <div className="w-5 h-5 rounded-md border border-white/20 group-hover:border-emerald-400 transition-colors" />
                                        <div className="flex-1">
                                            <div className="h-2 w-24 bg-white/20 rounded-full mb-1" />
                                            <div className="h-2 w-16 bg-white/10 rounded-full" />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </PrismCard>

                    </div>
                </div>

                {/* BOTTOM RAIL (Timeline/Context) */}
                <div className="flex-1">
                    {/* Placeholder for Timeline Rail */}
                </div>

            </div>

            {/* 3. NAVIGATION DOCK */}
            <PrismDock />

        </motion.div>
    );
};
