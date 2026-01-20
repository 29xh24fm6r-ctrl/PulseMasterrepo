"use client";

import { useOverlays } from "./OverlayContext";

import { TOKENS } from "@/lib/ui/tokens";

export function SystemBanner() {
    const { state, setBannerActive } = useOverlays();

    if (!state.bannerActive) return null;

    // Use warning colors if it's a limit message, else default
    const isLimit = state.bannerMessage?.toLowerCase().includes("limit");

    return (
        <div className="fixed top-16 left-0 right-0 z-[30] flex justify-center pointer-events-none animate-in fade-in slide-in-from-top-2 duration-300">
            <div className={`
                ${TOKENS.COLORS.glass.bg} 
                ${TOKENS.BLUR.md} 
                border 
                ${isLimit ? 'border-amber-500/20 text-amber-200' : 'border-emerald-500/20 text-emerald-200'}
                px-6 py-2.5 
                ${TOKENS.RADIUS.full}
                ${TOKENS.SHADOW.md}
                flex items-center gap-4 pointer-events-auto
            `}>
                <span className="text-sm font-medium tracking-wide">
                    {state.bannerMessage || "System operational"}
                </span>
                <button
                    onClick={() => setBannerActive(false)}
                    className={`hover:text-white transition-colors p-1 rounded-full hover:bg-white/10`}
                >
                    ×
                </button>
            </div>
        </div>
    );
}
