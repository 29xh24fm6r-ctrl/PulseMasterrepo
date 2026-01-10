"use client";

import { motion } from "framer-motion";

interface SystemChassisProps {
    capacity: "REDUCED" | "NOMINAL" | "PEAK";
    children: React.ReactNode;
}

export const SystemChassis = ({ capacity, children }: SystemChassisProps) => {
    // Simple corner brackets or frame lines to ground the experience.
    // DOES NOT INTERFERE with the center content.

    const color = capacity === "REDUCED" ? "border-amber-500/20" : "border-white/10";

    return (
        <div className="relative w-full h-full flex flex-col">
            {/* Top Frame */}
            <header className="w-full flex justify-between items-start p-6">
                <div className={`w-32 h-8 border-t border-l ${color} rounded-tl-lg`} />
                <div className={`w-32 h-8 border-t border-r ${color} rounded-tr-lg`} />
            </header>

            {/* Main Viewport */}
            <main className="flex-1 relative z-10 flex flex-col items-center justify-center">
                {children}
            </main>

            {/* Bottom Frame & Capacity Indicator */}
            <footer className="w-full flex justify-between items-end p-6">
                <div className={`w-32 h-8 border-b border-l ${color} rounded-bl-lg`} />

                {/* Embedded Capacity Readout */}
                <div className="pb-2 flex flex-col items-center">
                    <div className="flex gap-1 mb-1">
                        {[1, 2, 3].map((i) => (
                            <div
                                key={i}
                                className={`w-1 h-3 rounded-full ${(capacity === "PEAK" || (capacity === "NOMINAL" && i <= 2) || (capacity === "REDUCED" && i === 1))
                                        ? "bg-white/30"
                                        : "bg-white/5"
                                    }`}
                            />
                        ))}
                    </div>
                    <span className="text-[9px] uppercase tracking-[0.2em] text-white/20">
                        sys {capacity}
                    </span>
                </div>

                <div className={`w-32 h-8 border-b border-r ${color} rounded-br-lg`} />
            </footer>
        </div>
    );
};
