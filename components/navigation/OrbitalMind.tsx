"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, ArrowRight, Command } from "lucide-react";
import { usePathname } from "next/navigation";

export const OrbitalMind = () => {
    const [isOpen, setIsOpen] = useState(false);
    const pathname = usePathname();

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if ((e.metaKey || e.ctrlKey) && e.key === "k") {
                e.preventDefault();
                setIsOpen((prev) => !prev);
            }
            if (e.key === "Escape") {
                setIsOpen(false);
            }
        };

        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, []);

    // Close on navigation
    useEffect(() => {
        setIsOpen(false);
    }, [pathname]);

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={() => setIsOpen(false)}
                        className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm"
                    />

                    {/* Modal Container */}
                    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 pointer-events-none">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 20 }}
                            className="w-full max-w-2xl pointer-events-auto"
                        >
                            <div className="relative group">
                                <div className="absolute -inset-1 bg-gradient-to-r from-violet-600 to-indigo-600 rounded-2xl blur opacity-75 animate-pulse transition duration-1000" />

                                <div className="relative flex items-center bg-zinc-900/90 backdrop-blur-2xl border border-white/10 rounded-2xl shadow-2xl overflow-hidden">
                                    <div className="pl-6 text-violet-400">
                                        <Sparkles className="w-6 h-6 animate-pulse" />
                                    </div>
                                    <input
                                        autoFocus
                                        type="text"
                                        placeholder="Ask Pulse or Navigate..."
                                        className="w-full bg-transparent border-none px-6 py-6 text-white placeholder-zinc-500 focus:outline-none focus:ring-0 text-xl font-light tracking-wide"
                                    />
                                    <div className="pr-4 flex items-center gap-2">
                                        <div className="px-2 py-1 rounded bg-white/5 text-xs text-zinc-500 font-mono border border-white/5">ESC</div>
                                        <button className="p-2 rounded-lg bg-violet-600 text-white hover:bg-violet-500 transition-colors">
                                            <ArrowRight className="w-5 h-5" />
                                        </button>
                                    </div>
                                </div>

                                {/* Quick Actions (Mock) */}
                                <motion.div
                                    initial={{ opacity: 0, height: 0 }}
                                    animate={{ opacity: 1, height: 'auto' }}
                                    className="mt-4 bg-zinc-900/80 backdrop-blur-xl border border-white/10 rounded-xl overflow-hidden shadow-2xl"
                                >
                                    <div className="p-2 grid grid-cols-1 gap-1">
                                        <div className="px-4 py-2 text-xs font-medium text-zinc-500 uppercase tracking-wider">Suggested</div>
                                        <CommandRow icon={Command} label="Go to Dashboard" shortcut="G D" />
                                        <CommandRow icon={Sparkles} label="Ask AI Assistant" shortcut="Cmd J" />
                                    </div>
                                </motion.div>
                            </div>
                        </motion.div>
                    </div>
                </>
            )}
        </AnimatePresence>
    );
};

function CommandRow({ icon: Icon, label, shortcut }: { icon: any, label: string, shortcut: string }) {
    return (
        <button className="flex items-center justify-between w-full px-4 py-3 rounded-lg hover:bg-white/5 group transition-colors text-left">
            <div className="flex items-center gap-3">
                <Icon className="w-4 h-4 text-zinc-500 group-hover:text-white transition-colors" />
                <span className="text-zinc-300 group-hover:text-white transition-colors">{label}</span>
            </div>
            <span className="text-xs text-zinc-600 group-hover:text-zinc-400 font-mono transition-colors">{shortcut}</span>
        </button>
    )
}
