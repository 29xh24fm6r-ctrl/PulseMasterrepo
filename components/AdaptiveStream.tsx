
"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect } from "react";
import { CheckCircle, Clock, Zap, ArrowRight, ShieldAlert, Sparkles } from "lucide-react";
import { usePulse } from "@/hooks/usePulse";
import { createClient } from "@/lib/supabase/client";

interface StreamCard {
    id: string;
    type: "hero" | "action" | "insight" | "memory";
    title: string;
    subtitle?: string;
    timestamp: string;
    priority: "high" | "medium" | "low";
    energy?: "high" | "medium" | "low";
    actionUrl?: string;
    onDismiss?: () => void;
}

export function AdaptiveStream() {
    const [cards, setCards] = useState<StreamCard[]>([]);
    const { nextAction, tasks } = usePulse();
    const supabase = createClient();

    const handleDismiss = (id: string) => {
        setCards(prev => prev.filter(c => c.id !== id));
    };

    useEffect(() => {
        // Transform Pulse Data into Stream Format
        const streamItems: StreamCard[] = [];

        // 0. CORTEX ACTIONS (High Priority)
        const fetchCortexActions = async () => {
            const { data } = await supabase
                .from('proposed_actions')
                .select('*')
                .eq('status', 'pending')
                .order('confidence', { ascending: false });

            if (data) {
                const actionCards = data.map((action: any) => ({
                    id: action.id,
                    type: "insight" as const,
                    title: `Proposing: ${action.title}`,
                    subtitle: action.reasoning,
                    timestamp: "Just now",
                    priority: "high" as const,
                    energy: "medium" as const, // Default energy for mental decisions
                    actionUrl: `/api/cortex/approve/${action.id}`
                }));

                // Merge into state (avoiding duplicates if strict mode runs twice)
                setCards(prev => {
                    const existingIds = new Set(prev.map(c => c.id));
                    const newCards = actionCards.filter(c => !existingIds.has(c.id));
                    return [...newCards, ...prev]; // Cortex actions force to top? Or just merge. 
                    // Better strategy: Re-evaluate full list.
                });

                // For this MVP, let's just push to the ephemeral list we are building? 
                // No, fetch is async. We need to handle it separately or strictly chain.
                // Let's use a simpler pattern: Add to a separate state or just append to 'streamItems' if we can await it?
                // We can't await inside useEffect easily without an IIFE.
                // Let's rely on swr or react-query in future. For now, we will just set state when data arrives.
            }
        };

        fetchCortexActions();

        // 0.5 LIVE CALLS (Emergency Priority)
        const fetchLiveCalls = async () => {
            const { data } = await supabase
                .from('calls')
                .select('*')
                .eq('status', 'in-progress')
                .maybeSingle();

            if (data) {
                setCards(prev => {
                    if (prev.find(c => c.id === `call-${data.id}`)) return prev;
                    return [{
                        id: `call-${data.id}`,
                        type: "hero",
                        title: "Live Call in Progress",
                        subtitle: "Listening...",
                        timestamp: "Now",
                        priority: "high",
                        energy: "high",
                        actionUrl: "#" // No action yet, just display
                    }, ...prev];
                });
            }
        };
        fetchLiveCalls();

        // Subscribe to Call Status Changes & Transcripts
        const channel = supabase
            .channel('realtime-calls')
            .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'calls' }, (payload) => {
                const call = payload.new as any;
                if (call.status === 'in-progress') {
                    setCards(prev => {
                        const existing = prev.find(c => c.id === `call-${call.id}`);
                        if (existing) return prev; // Already exists
                        return [{
                            id: `call-${call.id}`,
                            type: "hero",
                            title: "Live Call Connected",
                            subtitle: call.transcript || "AI Assistant Active",
                            timestamp: "Now",
                            priority: "high",
                            energy: "high"
                        }, ...prev];
                    });
                } else if (call.status === 'completed') {
                    setCards(prev => prev.filter(c => c.id !== `call-${call.id}`));
                }
            })
            .on('broadcast', { event: 'transcript' }, (payload) => {
                const { callSid, text } = payload.payload;
                // Find card with this callSid (assuming we map callSid -> ID, or just iterate)
                // Since we don't have callSid on the card easily unless we store it, 
                // we'll search for ANY active call card or store callSid in card.metadata.
                // For MVP, update the first "hero" card aka the call card.
                setCards(prev => prev.map(card => {
                    if (card.id.startsWith('call-')) {
                        return { ...card, subtitle: `AI: ${text}` }; // Show latest snippet
                    }
                    return card;
                }));
            })
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };

        // 1. HERO CARD (Next Best Action)
        if (nextAction && !streamItems.find(c => c.id === 'hero-action')) {
            streamItems.push({
                id: "hero-action",
                type: "action",
                title: nextAction?.task?.title || "No suggestions",
                subtitle: nextAction?.reasoning || "Waiting for context...",
                onDismiss: () => handleDismiss("hero-action"),
                timestamp: "Now",
                priority: "high",
                energy: nextAction?.energyRequired as any
            });
        }

        // 2. Secondary Actions
        tasks.slice(0, 3).forEach(t => {
            streamItems.push({
                id: t.id,
                type: "action",
                title: t.title,
                subtitle: t.project || "Backlog",
                timestamp: "Today",
                priority: "medium"
            });
        });

        setCards(streamItems);
    }, [nextAction, tasks]);

    return (
        <div className="relative w-full max-w-2xl mx-auto px-6 pb-24 pt-32 space-y-6 z-10">
            <AnimatePresence>
                {cards.map((card, index) => (
                    <StreamItem key={card.id} card={card} index={index} />
                ))}
                {cards.length === 0 && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="relative overflow-hidden rounded-3xl bg-white/5 border border-white/10 p-8 text-center backdrop-blur-xl"
                    >
                        <div className="mx-auto w-12 h-12 bg-violet-500/20 rounded-full flex items-center justify-center mb-4">
                            <Sparkles className="w-6 h-6 text-violet-300" />
                        </div>
                        <h3 className="text-xl font-medium text-white mb-2">Ready to Start</h3>
                        <p className="text-zinc-400 max-w-sm mx-auto">
                            The system is standing by. Create a task, journal entry, or start a session to wake up the stream.
                        </p>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

function StreamItem({ card, index }: { card: StreamCard; index: number }) {
    const isHero = index === 0;

    return (
        <motion.div
            layout
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            className={`
        relative overflow-hidden rounded-3xl backdrop-blur-xl border border-white/10 shadow-2xl
        ${isHero ? "bg-white/10 p-8 min-h-[200px]" : "bg-white/5 p-5 min-h-[80px] opacity-80 hover:opacity-100"}
      `}
        >
            {/* Dynamic Background Mesh for Hero */}
            {isHero && (
                <div className="absolute inset-0 bg-gradient-to-br from-violet-500/20 to-fuchsia-500/20 -z-10 pointer-events-none" />
            )}

            <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                    {isHero && (
                        <div className="flex items-center gap-2 mb-3">
                            <span className="text-[10px] font-bold uppercase tracking-widest text-violet-300 bg-violet-500/20 px-2 py-1 rounded-full">
                                Next Best Action
                            </span>
                            {card.energy && (
                                <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-300 bg-emerald-500/20 px-2 py-1 rounded-full flex items-center gap-1">
                                    <Zap size={10} /> {card.energy} Energy
                                </span>
                            )}
                        </div>
                    )}

                    <h3 className={`font-medium text-white leading-tight ${isHero ? "text-2xl mb-2" : "text-lg"}`}>
                        {card.title}
                    </h3>

                    {card.subtitle && (
                        <p className={`text-white/60 ${isHero ? "text-base leading-relaxed" : "text-sm truncate"}`}>
                            {card.subtitle}
                        </p>
                    )}
                </div>

                {isHero ? (
                    <button
                        onClick={() => {
                            if (card.actionUrl) {
                                // Optimistically remove or update UI
                                // For now, just navigate or fetch. 
                                // Since it's an API route, we prefer fetch to execute 'action'.
                                fetch(card.actionUrl, { method: 'POST' }).then(() => {
                                    // Remove card from state on success
                                    // logic to remove card... passed from parent? 
                                    // Simplified: Just redirect or alert for now, or trigger parent refresh.
                                    window.location.reload(); // Simple refresh to clear pending
                                });
                            }
                        }}
                        className="h-12 w-12 rounded-full bg-white text-black flex items-center justify-center hover:scale-105 transition-transform cursor-pointer"
                    >
                        <ArrowRight size={20} />
                    </button>
                ) : (
                    <div className="h-2 w-2 rounded-full bg-white/20 mt-2" />
                )}
            </div>
        </motion.div >
    );
}
