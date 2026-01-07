
"use client";

import { useEffect, useState, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { motion, AnimatePresence } from "framer-motion";
import { BrainCircuit, X, Zap } from "lucide-react";

interface WhisperInsight {
    id: string;
    type: "truth_detection" | "negotiation_tactic" | "suggestion" | "critical_alert";
    content: string;
    confidence: number; // 0-100
    timestamp: string;
}

export function WhisperFeed() {
    const [insights, setInsights] = useState<WhisperInsight[]>([]);
    const [isVisible, setIsVisible] = useState(false);
    const supabase = createClient();
    const bottomRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        console.log("⚡ [WhisperUI] Connecting to 'cyrano_whispers'...");

        const channel = supabase
            .channel("cyrano_whispers")
            .on(
                "broadcast",
                { event: "insight" },
                (payload: { payload: WhisperInsight }) => {
                    console.log("⚡ [WhisperUI] Received:", payload.payload);
                    setIsVisible(true);
                    setInsights((prev) => [...prev, payload.payload]);

                    // Auto-scroll
                    setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, []);

    const getTypeColor = (type: string) => {
        switch (type) {
            case "truth_detection": return "border-red-500 bg-red-500/10 text-red-200";
            case "negotiation_tactic": return "border-blue-500 bg-blue-500/10 text-blue-200";
            case "critical_alert": return "border-amber-500 bg-amber-500/10 text-amber-200";
            default: return "border-purple-500 bg-purple-500/10 text-purple-200";
        }
    };

    if (!isVisible && insights.length === 0) return null;

    return (
        <div className="fixed bottom-12 right-12 w-96 z-50 font-sans">
            <div className="flex items-center justify-between mb-2 p-2 bg-black/60 backdrop-blur-md rounded-lg border border-white/10">
                <div className="flex items-center gap-2 text-purple-400">
                    <BrainCircuit size={18} />
                    <span className="text-xs font-bold tracking-widest uppercase">Cyrano Active</span>
                </div>
                <button onClick={() => setIsVisible(false)} className="text-white/40 hover:text-white">
                    <X size={14} />
                </button>
            </div>

            <div className="flex flex-col gap-3 max-h-[60vh] overflow-y-auto px-1 py-4 mask-fade-top">
                <AnimatePresence>
                    {insights.map((insight) => (
                        <motion.div
                            key={insight.id}
                            initial={{ opacity: 0, x: 50, scale: 0.95 }}
                            animate={{ opacity: 1, x: 0, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.9 }}
                            className={`p-4 rounded-xl border-l-4 backdrop-blur-xl shadow-2xl ${getTypeColor(insight.type)}`}
                        >
                            <div className="flex justify-between items-start mb-1">
                                <span className="text-[10px] font-bold uppercase opacity-70 tracking-wider">
                                    {insight.type.replace("_", " ")}
                                </span>
                                <div className="flex items-center gap-1 text-[10px] opacity-60">
                                    <Zap size={10} className="fill-current" />
                                    {insight.confidence}%
                                </div>
                            </div>
                            <p className="text-sm font-medium leading-relaxed drop-shadow-md">
                                {insight.content}
                            </p>
                        </motion.div>
                    ))}
                </AnimatePresence>
                <div ref={bottomRef} />
            </div>
        </div>
    );
}
