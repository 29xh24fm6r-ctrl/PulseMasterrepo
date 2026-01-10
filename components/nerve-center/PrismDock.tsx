"use client";

import { motion } from "framer-motion";
import { Compass, Users, CheckSquare, Book, Settings, Flame } from "lucide-react";
import Link from "next/link";

const NAV_ITEMS = [
    { id: "pursuits", icon: Compass, label: "Pursuits", path: "/projects" }, // Mapped to /projects route but labelled Pursuits
    { id: "steps", icon: CheckSquare, label: "Steps", path: "/tasks" }, // Mapped to /tasks
    { id: "tribe", icon: Users, label: "Tribe", path: "/relationships" },
    { id: "journal", icon: Book, label: "Journal", path: "/journal" },
    { id: "streaks", icon: Flame, label: "Momentum", path: "/streaks" }, // Added visual interest
];

export const PrismDock = () => {
    return (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50">
            <motion.div
                initial={{ y: 100, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.5, type: "spring", stiffness: 100 }}
                className="flex items-center gap-1 p-2 rounded-full bg-black/40 backdrop-blur-xl border border-white/10 shadow-[0_20px_40px_rgba(0,0,0,0.5)]"
            >
                {NAV_ITEMS.map((item) => (
                    <Link key={item.id} href={item.path} passHref legacyBehavior>
                        <motion.a
                            whileHover={{
                                scale: 1.1,
                                backgroundColor: "rgba(255, 255, 255, 0.15)",
                                y: -5
                            }}
                            whileTap={{ scale: 0.95 }}
                            className="relative group p-4 rounded-full flex flex-col items-center justify-center cursor-pointer transition-colors"
                        >
                            <item.icon className="w-6 h-6 text-white/90 group-hover:text-white transition-colors drop-shadow-lg" />

                            {/* Tooltip (Prism Style) */}
                            <div className="absolute -top-14 left-1/2 -translate-x-1/2 px-3 py-1.5 bg-black/80 backdrop-blur-md border border-white/10 rounded-lg text-xs font-bold tracking-wide text-white opacity-0 group-hover:opacity-100 transition-all transform scale-95 group-hover:scale-100 pointer-events-none whitespace-nowrap shadow-xl">
                                {item.label}
                                <div className="absolute bottom-[-4px] left-1/2 -translate-x-1/2 w-2 h-2 bg-black/80 rotate-45 border-r border-b border-white/10" />
                            </div>
                        </motion.a>
                    </Link>
                ))}
            </motion.div>
        </div>
    );
};
