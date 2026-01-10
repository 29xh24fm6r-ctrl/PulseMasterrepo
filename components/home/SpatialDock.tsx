"use client";

import { motion, useMotionValue, useSpring, useTransform } from "framer-motion";
import { useRef } from "react";
import Link from "next/link";
import {
    Home, Search, Mic, Settings,
    Layers, Command
} from "lucide-react";

export const SpatialDock = () => {
    return (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50">
            <div className="flex items-end gap-4 px-4 py-3 bg-zinc-900/50 backdrop-blur-2xl border border-white/10 rounded-2xl shadow-2xl shadow-black/50">
                <DockIcon icon={<Home />} label="Home" href="/" />
                <DockIcon icon={<Search />} label="Search" href="/search" />

                <div className="w-[1px] h-8 bg-white/10 mx-1" />

                <DockIcon icon={<Mic />} label="Voice" href="/voice" active />
                <DockIcon icon={<Layers />} label="Stack" href="/tasks" />
                <DockIcon icon={<Command />} label="Cmd" href="/cmd" />

                <div className="w-[1px] h-8 bg-white/10 mx-1" />

                <DockIcon icon={<Settings />} label="Settings" href="/settings" />
            </div>
        </div>
    );
};

function DockIcon({ icon, label, href, active = false }: { icon: React.ReactNode; label: string; href: string; active?: boolean }) {
    const ref = useRef<HTMLDivElement>(null);

    // Basic hover scale for now - full liquid physics can be added in V2 
    // (keeping it simpler to avoid complex mouse tracking setup in this iteration)

    return (
        <Link href={href}>
            <motion.div
                ref={ref}
                whileHover={{ scale: 1.2, y: -5 }}
                whileTap={{ scale: 0.95 }}
                className={`relative group p-3 rounded-xl transition-all duration-300 ${active
                        ? "bg-violet-500 text-white shadow-[0_0_20px_rgba(139,92,246,0.5)]"
                        : "bg-white/5 text-zinc-400 hover:text-white hover:bg-white/10"
                    }`}
            >
                <span className="relative z-10 w-6 h-6 flex items-center justify-center">
                    {icon}
                </span>

                {/* Tooltip */}
                <span className="absolute -top-10 left-1/2 -translate-x-1/2 px-2 py-1 bg-black/80 text-white text-[10px] rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap">
                    {label}
                </span>
            </motion.div>
        </Link>
    );
}
