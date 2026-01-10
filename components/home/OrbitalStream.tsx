"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Sparkles, ArrowRight } from "lucide-react";

export const OrbitalStream = () => {
    const [isFocused, setIsFocused] = useState(false);

    return (
        <div className="relative z-50 w-full max-w-2xl mx-auto mt-8">
            <div className="relative group">
                <div className={`absolute -inset-1 bg-gradient-to-r from-violet-600 to-indigo-600 rounded-2xl blur opacity-25 group-hover:opacity-75 transition duration-1000 group-hover:duration-200 ${isFocused ? 'opacity-75' : ''}`} />

                <div className="relative flex items-center bg-zinc-900/80 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl">
                    {/* Proactive Eye */}
                    <div className={`pl-4 ${isFocused ? 'text-violet-400' : 'text-zinc-500'}`}>
                        <Sparkles className={`w-5 h-5 ${isFocused && 'animate-pulse'}`} />
                    </div>

                    <input
                        type="text"
                        placeholder="Ask Pulse..."
                        className="w-full bg-transparent border-none px-4 py-4 text-white placeholder-zinc-500 focus:outline-none focus:ring-0 text-lg font-light tracking-wide"
                        onFocus={() => setIsFocused(true)}
                        onBlur={() => setIsFocused(false)}
                    />

                    {/* Action Trigger */}
                    <div className="pr-4">
                        <button className={`p-2 rounded-lg transition-all ${isFocused ? 'bg-violet-600 text-white' : 'bg-white/5 text-zinc-600'}`}>
                            <ArrowRight className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};
