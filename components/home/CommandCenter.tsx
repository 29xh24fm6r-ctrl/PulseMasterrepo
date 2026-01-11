"use client";

import { motion } from "framer-motion";
import { MissionControl } from "@/components/nerve-center/MissionControl";
import { TemporalHero } from "@/components/nerve-center/TemporalHero";
import { PressureRail } from "@/components/nerve-center/PressureRail";
import { PresenceField } from "@/components/nerve-center/PresenceField";

export const CommandCenter = () => {
    return (
        <div className="relative w-full h-screen bg-[#050505] text-white font-sans overflow-hidden selection:bg-red-500/30">

            {/* 1. AMBIENT GRADIENT (The Void) */}
            <div className="absolute inset-0 bg-radial-gradient from-zinc-900/20 to-transparent pointer-events-none" />

            {/* 2. MISSION CONTROL (Top Right - Hardware) */}
            <div className="absolute top-8 right-8 z-50">
                <MissionControl />
            </div>

            {/* 3. THE CENTER (The Monolith) */}
            <div className="absolute inset-0 flex items-center justify-center z-10">
                <TemporalHero />
            </div>

            {/* 4. PRESSURE RAIL (The Stream - Right Edge) */}
            <div className="absolute top-0 bottom-0 right-12 z-20 hidden lg:block">
                <PressureRail />
            </div>

            {/* 5. PRESENCE FIELD (The Field - Bottom) */}
            <div className="absolute bottom-12 left-0 right-0 flex justify-center z-20">
                <PresenceField />
            </div>

            {/* 6. CONTEXT SIDEBAR (Left - Receded/Minimal) */}
            {/* Kept minimal or hidden during Focus Mode to ensure dominance */}
            <div className="absolute top-8 left-8 flex flex-col gap-4 opacity-30 hover:opacity-100 transition-opacity duration-500 z-30">
                <div className="w-8 h-8 bg-zinc-800 rounded-lg" />
                <div className="w-8 h-8 bg-zinc-900 rounded-lg" />
                <div className="w-8 h-8 bg-zinc-900 rounded-lg" />
            </div>

        </div>
    );
};
