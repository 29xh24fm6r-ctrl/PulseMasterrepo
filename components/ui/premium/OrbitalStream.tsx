"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, ArrowRight } from "lucide-react";
import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import { useEncounter } from "@/components/encounter/EncounterContext";

interface Thought {
    text: string;
    type: string;
    context: string;
}

export function OrbitalStream() {
    const pathname = usePathname();
    const [thoughts, setThoughts] = useState<Thought[]>([]);
    const [thoughtIndex, setThoughtIndex] = useState(0);
    const [loading, setLoading] = useState(true);

    // Poll Cortex for Thoughts based on current path
    useEffect(() => {
        async function fetchThoughts() {
            try {
                const res = await fetch(`/api/cortex/thoughts?path=${encodeURIComponent(pathname)}`);
                const data = await res.json();
                if (data.thoughts && data.thoughts.length > 0) {
                    setThoughts(data.thoughts);
                    setThoughtIndex(0); // Reset to first thought on context change
                }
            } catch (e) {
                console.error("Failed to sync with Cortex:", e);
            } finally {
                setLoading(false);
            }
        }

        fetchThoughts();

        // Refresh thoughts every 10 seconds or when path changes
        const interval = setInterval(fetchThoughts, 10000);
        return () => clearInterval(interval);
    }, [pathname]);


    // Cycle through current thoughts
    useEffect(() => {
        if (thoughts.length <= 1) return;
        const interval = setInterval(() => {
            setThoughtIndex((prev) => (prev + 1) % thoughts.length);
        }, 5000);
        return () => clearInterval(interval);
    }, [thoughts]);

    const currentThought = thoughts[thoughtIndex];

    const { state } = useEncounter();

    // Silence Discipline (Fix 3): Hide in CLEAR state
    if ((!currentThought && !loading) || state === 'CLEAR') return null;

    return (
        <div className="fixed top-8 left-1/2 -translate-x-1/2 z-50 flex flex-col items-center justify-center pointer-events-none">
            <motion.div
                className="
          flex items-center gap-4 px-6 py-3 
          rounded-2xl 
          bg-black/20 backdrop-blur-3xl 
          border border-white/5 
          shadow-2xl shadow-violet-500/5 
          pointer-events-auto cursor-pointer
          group
          hover:bg-black/40 hover:border-white/10 hover:shadow-violet-500/20
          transition-all duration-500
        "
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                whileHover={{ scale: 1.02 }}
            >
                {/* The "Eye" of the Orbit */}
                <div className="relative flex items-center justify-center w-6 h-6">
                    <div className="absolute inset-0 bg-violet-500/30 rounded-full blur-md animate-pulse" />
                    <Sparkles className="w-4 h-4 text-violet-200 relative z-10" />
                </div>

                {/* The Stream Content */}
                <div className="h-6 overflow-hidden flex flex-col justify-center min-w-[200px]">
                    <AnimatePresence mode="wait">
                        {currentThought ? (
                            <motion.div
                                key={`${pathname}-${thoughtIndex}`}
                                initial={{ opacity: 0, y: 10, filter: "blur(4px)" }}
                                animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                                exit={{ opacity: 0, y: -10, filter: "blur(4px)" }}
                                transition={{ duration: 0.4, ease: "easeOut" }}
                                className="flex items-center gap-2"
                            >
                                <span className="text-xs font-semibold uppercase tracking-wider text-violet-400/80">
                                    {currentThought.context}
                                </span>
                                <span className="w-[1px] h-3 bg-white/10" />
                                <span className="text-sm font-medium text-slate-200/90 group-hover:text-white transition-colors">
                                    {currentThought.text}
                                </span>
                            </motion.div>
                        ) : (
                            <div className="opacity-50 text-xs">Syncing with Cosmos...</div>
                        )}

                    </AnimatePresence>
                </div>

                {/* Action Indicator */}
                <div className="opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-300">
                    <ArrowRight className="w-4 h-4 text-white/50" />
                </div>

            </motion.div>

            {/* Reflection / Grounding Shadow */}
            <div className="absolute -bottom-4 w-32 h-1 bg-violet-500/20 blur-xl rounded-full" />
        </div>
    );
}
