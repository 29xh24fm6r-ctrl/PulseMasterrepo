'use client';

import { DailyOrientation } from "@/lib/orientation/types";
import { submitOrientationFeedback } from "@/lib/orientation/actions";
import { useState, useTransition } from "react";
import { Check, X } from "lucide-react"; // assuming lucide-react is available

export function OrientationHeader({
    orientation,
    feedbackGiven: initialFeedbackGiven = false
}: {
    orientation: DailyOrientation;
    feedbackGiven?: boolean;
}) {
    // Visual mapping for states
    const colors: Record<string, string> = {
        stable: "text-emerald-400/90",
        tightening: "text-amber-400/90",
        heavy: "text-rose-400/90",
        recovering: "text-indigo-400/90",
        volatile: "text-purple-400/90",
    };

    const accentColor = colors[orientation.dominant_state] || colors.stable;
    const [hasFeedback, setHasFeedback] = useState(initialFeedbackGiven);
    const [isPending, startTransition] = useTransition();

    const handleFeedback = (type: 'accurate' | 'off') => {
        if (hasFeedback) return;
        setHasFeedback(true); // Optimistic
        startTransition(() => {
            submitOrientationFeedback(type);
        });
    };

    return (
        <div className="w-full flex flex-col items-center justify-center py-5 border-b border-white/5 bg-black/40 backdrop-blur-md z-50 animate-in fade-in slide-in-from-top-4 duration-700 group">
            <div className={`text-lg md:text-xl font-light tracking-wide ${accentColor} transition-all duration-700 text-center px-4`}>
                {orientation.primary_reason}
            </div>
            {orientation.secondary_factors.length > 0 && (
                <div className="flex gap-4 mt-2 opacity-60">
                    {orientation.secondary_factors.map((f, i) => (
                        <span key={i} className="text-[10px] uppercase tracking-[0.2em] text-white/50 font-mono">
                            {f}
                        </span>
                    ))}
                </div>
            )}

            {/* Tuner Actions (Micro-Feedback) */}
            {!hasFeedback && (
                <div className="absolute right-4 top-1/2 -translate-y-1/2 flex flex-col gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-500">
                    <button
                        onClick={() => handleFeedback('accurate')}
                        disabled={isPending}
                        className="p-1.5 rounded-full hover:bg-emerald-500/10 text-white/10 hover:text-emerald-400 transition-colors"
                        title="Accurate"
                    >
                        <Check size={12} />
                    </button>
                    <button
                        onClick={() => handleFeedback('off')}
                        disabled={isPending}
                        className="p-1.5 rounded-full hover:bg-rose-500/10 text-white/10 hover:text-rose-400 transition-colors"
                        title="Off"
                    >
                        <X size={12} />
                    </button>
                </div>
            )}
        </div>
    );
}
