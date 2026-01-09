"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, Globe, Shield, User, Brain, X } from "lucide-react";

interface PreCogProps {
    isOpen: boolean;
    onClose: () => void;
    contextQuery?: string; // The person or topic to investigate
}

export function PreCogSidebar({ isOpen, onClose, contextQuery }: PreCogProps) {
    const [loading, setLoading] = useState(true);

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[60]"
                    />

                    {/* Sidebar Panel */}
                    <motion.div
                        initial={{ x: "100%" }}
                        animate={{ x: 0 }}
                        exit={{ x: "100%" }}
                        transition={{ type: "spring", damping: 25, stiffness: 200 }}
                        className="fixed right-0 top-0 bottom-0 w-[400px] bg-[#0a070e]/95 backdrop-blur-2xl border-l border-white/10 z-[70] p-6 shadow-2xl flex flex-col gap-6"
                    >
                        {/* Header */}
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2 text-[#7f13ec]">
                                <Brain className="size-5" />
                                <span className="text-xs font-bold uppercase tracking-widest">Pre-Cog Intelligence</span>
                            </div>
                            <button onClick={onClose} className="text-white/40 hover:text-white transition-colors">
                                <X className="size-5" />
                            </button>
                        </div>

                        {/* Search / Context Input */}
                        <div className="relative">
                            <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
                                <Search className="size-4 text-white/30" />
                            </div>
                            <input
                                type="text"
                                value={contextQuery || ""}
                                placeholder="Investigating target..."
                                className="w-full bg-white/5 border border-white/10 rounded-lg pl-10 pr-4 py-3 text-sm font-medium text-white focus:outline-none focus:border-[#7f13ec]/50 transition-colors"
                            />
                        </div>

                        {/* Main Content Area */}
                        <div className="flex-1 overflow-y-auto space-y-6">

                            {/* Identity Card */}
                            <div className="p-4 rounded-xl bg-white/5 border border-white/10 relative overflow-hidden">
                                <div className="absolute top-0 right-0 p-2 opacity-20">
                                    <User className="size-16" />
                                </div>
                                <h3 className="text-lg font-bold text-white mb-1">Target Identity</h3>
                                <p className="text-xs text-white/50 mb-4">Analyzing digital footprint...</p>
                                <div className="space-y-2">
                                    <div className="h-2 w-3/4 bg-white/10 rounded animate-pulse" />
                                    <div className="h-2 w-1/2 bg-white/10 rounded animate-pulse" />
                                </div>
                            </div>

                            {/* Live Web Intel */}
                            <div className="space-y-3">
                                <h4 className="text-xs font-bold uppercase text-white/40 flex items-center gap-2">
                                    <Globe className="size-3" /> Live Web Signals (Exa)
                                </h4>
                                <div className="p-3 rounded-lg bg-white/5 border border-white/5 text-xs text-white/60">
                                    Scanning public records and news sources...
                                </div>
                            </div>

                        </div>

                        {/* Footer / Actions */}
                        <div className="mt-auto pt-4 border-t border-white/10 flex flex-col gap-2">
                            <button className="w-full py-3 bg-[#7f13ec] hover:bg-[#7f13ec]/80 text-white text-xs font-bold uppercase tracking-wider rounded-lg transition-colors shadow-lg shadow-[#7f13ec]/20">
                                Generate Briefing Dossier
                            </button>
                        </div>

                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
}
