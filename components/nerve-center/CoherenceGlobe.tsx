"use client";

import { motion } from "framer-motion";
import { useEffect, useRef } from "react";

interface CoherenceGlobeProps {
    status: "NOMINAL" | "DRIFT" | "CRITICAL";
}

export const CoherenceGlobe = ({ status }: CoherenceGlobeProps) => {
    // Colors based on status
    const colors = {
        NOMINAL: "text-emerald-500",
        DRIFT: "text-amber-500",
        CRITICAL: "text-red-600"
    };

    const glowColors = {
        NOMINAL: "shadow-emerald-500/20",
        DRIFT: "shadow-amber-500/20",
        CRITICAL: "shadow-red-500/20"
    };

    return (
        <div className="relative w-full h-full flex items-center justify-center overflow-hidden border border-white/10 bg-black/40 rounded-sm">

            {/* HUD Overlay Lines */}
            <div className="absolute inset-0 z-20 pointer-events-none">
                <div className="absolute top-4 left-4 text-[10px] uppercase tracking-[0.2em] text-zinc-500">
                    System Coherence Model
                </div>
                <div className={`absolute top-4 right-4 text-[10px] uppercase tracking-[0.2em] px-2 py-0.5 border ${colors[status]} border-opacity-30 bg-opacity-10 bg-current`}>
                    Priority: Alpha
                </div>

                {/* Corner Ticks */}
                <div className="absolute top-0 left-0 w-4 h-4 border-l border-t border-zinc-600" />
                <div className="absolute top-0 right-0 w-4 h-4 border-r border-t border-zinc-600" />
                <div className="absolute bottom-0 left-0 w-4 h-4 border-l border-b border-zinc-600" />
                <div className="absolute bottom-0 right-0 w-4 h-4 border-r border-b border-zinc-600" />
            </div>

            {/* The Globe (CSS 3D Wireframe Simulation) */}
            <div className="relative w-[80%] h-[80%] flex items-center justify-center">
                <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 60, repeat: Infinity, ease: "linear" }}
                    className={`w-full h-full rounded-full border-[0.5px] border-dashed border-opacity-30 ${colors[status]} relative`}
                >
                    {/* Latitude Lines */}
                    {[...Array(6)].map((_, i) => (
                        <div key={`lat-${i}`} className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full border-[0.5px] border-opacity-20 ${colors[status]}`}
                            style={{
                                width: `${100 - (i * 15)}%`,
                                height: `${(i % 2 === 0) ? 30 + (i * 10) : 100 - (i * 15)}%`,
                                transform: `translate(-50%, -50%) rotateX(${60 + (i * 5)}deg)`
                            }}
                        />
                    ))}

                    {/* Longitude Lines */}
                    {[...Array(4)].map((_, i) => (
                        <div key={`long-${i}`} className={`absolute inset-0 rounded-full border-[0.5px] border-opacity-20 ${colors[status]}`}
                            style={{ transform: `rotate(${i * 45}deg)` }}
                        />
                    ))}
                </motion.div>

                {/* Core Glow */}
                <div className={`absolute inset-0 rounded-full blur-3xl opacity-20 ${status === 'DRIFT' ? 'bg-amber-600' : 'bg-emerald-600'}`} />

                {/* Status Label (Center) */}
                {status === 'DRIFT' && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center z-30">
                        <h1 className="text-4xl md:text-5xl font-bold text-white tracking-tighter uppercase">
                            Drift
                        </h1>
                        <h1 className="text-4xl md:text-5xl font-bold text-white tracking-tighter uppercase">
                            Detected
                        </h1>
                        <div className="mt-4 px-4 py-1 bg-amber-500 text-black font-mono text-xs uppercase tracking-widest font-bold">
                            Re-Anchor Priorities
                        </div>
                    </div>
                )}
            </div>

            {/* Analysis Overlay (Drift Details) */}
            {status === 'DRIFT' && (
                <div className="absolute bottom-8 right-8 text-right">
                    <div className="text-[10px] text-zinc-500 uppercase tracking-widest mb-1">Variance</div>
                    <div className="text-3xl font-mono text-red-500">+12%</div>
                </div>
            )}
            {status === 'DRIFT' && (
                <div className="absolute bottom-8 left-8 text-left">
                    <div className="text-[10px] text-zinc-500 uppercase tracking-widest mb-1">Focus Index</div>
                    <div className="text-3xl font-mono text-white">68<span className="text-sm text-zinc-500">%</span></div>
                </div>
            )}
        </div>
    );
}
