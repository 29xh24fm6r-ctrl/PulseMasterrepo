"use client";

import { OrbitalStream } from "@/components/ui/premium/OrbitalStream";
import { FocusWidget } from "./FocusWidget";
import { motion } from "framer-motion";
import { Wifi } from "lucide-react";

export function Atmosphere() {
    return (
        <motion.div
            className="fixed top-0 left-0 right-0 z-50 px-8 py-6 flex items-start justify-between pointer-events-none"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, delay: 0.5 }}
        >
            {/* Left Sector: Ambient System Status (The "Silence") */}
            <div className="flex flex-col gap-1 pointer-events-auto opacity-40 hover:opacity-80 transition-opacity">
                <div className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="text-[10px] uppercase tracking-[0.2em] text-emerald-400 font-medium">Pulse OS</span>
                </div>
                <div className="hidden md:flex items-center gap-2 text-zinc-500 text-[10px] uppercase tracking-widest pl-3.5">
                    <Wifi className="w-3 h-3" />
                    <span>Online</span>
                </div>
            </div>

            {/* Center Sector: The Orbital Mind (OrbitalStream is absolute centered by itself, but we reserve space here for structure) */}
            <div className="absolute top-0 left-0 right-0 h-24 flex justify-center pointer-events-none">
                {/* OrbitalStream handles its own positioning, but acts as the centerpiece */}
            </div>

            {/* Right Sector: Active Widgets (The "Focus") */}
            <div className="flex items-center gap-4 pointer-events-auto">
                <FocusWidget />
            </div>

        </motion.div>
    );
}
