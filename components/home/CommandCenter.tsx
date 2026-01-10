"use client";

import { motion } from "framer-motion";
import { useEncounter } from "@/components/encounter/EncounterContext";
import { LivingBackground } from "@/components/nerve-center/LivingBackground";
import { ActiveMission } from "@/components/nerve-center/ActiveMission";
import { TimeStream } from "@/components/nerve-center/TimeStream";
import { CommandDeck } from "@/components/nerve-center/CommandDeck";

export const CommandCenter = () => {
    const { resolveEncounter, isResolved } = useEncounter();

    // MOCK DATA for the HUD (Fact-Based)
    const MOCK_TIME_BLOCKS = [
        { id: "1", time: "09:00", label: "Morning Brief", status: "PAST" as const },
        { id: "2", time: "11:34", label: "Strategy Block", status: "CURRENT" as const },
        { id: "3", time: "14:00", label: "Team Sync", status: "FUTURE" as const },
        { id: "4", time: "17:00", label: "Shutdown", status: "FUTURE" as const },
    ];

    const MISSION = {
        title: "Q1 Strategy",
        subtitle: "Deep Work session active. 26m remaining in block.",
        type: "FOCUS" as const // or EVENT, FREE
    };

    if (isResolved) return null;

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="w-full h-screen fixed inset-0 z-50 bg-black text-white font-sans overflow-hidden"
        >
            {/* 1. THE CANVAS */}
            <LivingBackground />

            {/* 2. THE HUD GRID */}
            <div className="relative z-10 w-full h-full max-w-[1600px] mx-auto grid grid-cols-12 gap-8 px-8 py-12">

                {/* Left Wing: TIME */}
                <div className="hidden lg:block col-span-3 h-full">
                    <TimeStream blocks={MOCK_TIME_BLOCKS} />
                </div>

                {/* Center Stage: MISSION */}
                <div className="col-span-12 lg:col-span-6 h-full flex items-center justify-center">
                    <ActiveMission
                        title={MISSION.title}
                        subtitle={MISSION.subtitle}
                        type={MISSION.type}
                        onEngage={resolveEncounter}
                    />
                </div>

                {/* Right Wing: LOAD (Placeholder for BioMetricNav in Phase 5.x) */}
                <div className="hidden lg:flex col-span-3 h-full flex-col justify-center items-end pr-8 gap-8 opacity-60">
                    {/* Simple Status/Load indicators */}
                    <div className="flex flex-col items-end gap-1">
                        <div className="text-[10px] uppercase tracking-widest text-zinc-500">System Load</div>
                        <div className="flex gap-1">
                            {[1, 2, 3, 4, 5].map(i => <div key={i} className={`w-1 h-4 ${i <= 2 ? 'bg-emerald-500' : 'bg-zinc-800'}`} />)}
                        </div>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                        <div className="text-[10px] uppercase tracking-widest text-zinc-500">Cognitive Capacity</div>
                        <div className="flex gap-1">
                            {[1, 2, 3, 4, 5].map(i => <div key={i} className={`w-1 h-4 ${i <= 4 ? 'bg-indigo-500' : 'bg-zinc-800'}`} />)}
                        </div>
                    </div>
                </div>

            </div>

            {/* 3. NAVIGATION (The Deck) */}
            <CommandDeck />

        </motion.div>
    );
};
