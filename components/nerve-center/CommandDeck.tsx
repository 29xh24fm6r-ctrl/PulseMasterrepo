"use client";

import { motion } from "framer-motion";
import { Home, List, Users, BookOpen, Layers } from "lucide-react";
import Link from "next/link"; // Assuming Next.js App Router

const NAV_ITEMS = [
    { id: "home", icon: Home, label: "Center", path: "/" },
    { id: "tasks", icon: List, label: "Tasks", path: "/tasks" },
    { id: "projects", icon: Layers, label: "Projects", path: "/projects" },
    { id: "people", icon: Users, label: "People", path: "/relationships" },
    { id: "journal", icon: BookOpen, label: "Journal", path: "/journal" },
];

export const CommandDeck = () => {
    return (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50">
            <motion.div
                initial={{ y: 50, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.8, type: "spring", stiffness: 200, damping: 20 }}
                className="flex items-center gap-2 px-3 py-3 rounded-full bg-white/5 backdrop-blur-2xl border border-white/10 shadow-2xl"
            >
                {NAV_ITEMS.map((item) => (
                    <Link key={item.id} href={item.path} passHref legacyBehavior>
                        {/* Using anchor tag for legacyBehavior to ensure tooltips/motion work cleanly on the element */}
                        <motion.a
                            whileHover={{ scale: 1.2, backgroundColor: "rgba(255, 255, 255, 0.1)" }}
                            whileTap={{ scale: 0.95 }}
                            className="relative group p-3 rounded-full flex items-center justify-center cursor-pointer transition-colors"
                        >
                            <item.icon className="w-5 h-5 text-white/80 group-hover:text-white transition-colors" />

                            {/* Tooltip */}
                            <div className="absolute -top-10 left-1/2 -translate-x-1/2 px-2 py-1 bg-black/80 border border-white/10 rounded text-[10px] text-white opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap">
                                {item.label}
                            </div>

                            {/* Active Dot (Optional, could add logic later) */}
                            {/* <div className="absolute bottom-1 w-1 h-1 rounded-full bg-white opacity-0 group-hover:opacity-100" /> */}
                        </motion.a>
                    </Link>
                ))}
            </motion.div>
        </div>
    );
};
