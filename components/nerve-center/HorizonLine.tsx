"use client";

import { motion } from "framer-motion";

interface HorizonLineProps {
    status: "CLEAR" | "IMMINENT" | "DISTANT";
    timeToImpact?: string; // e.g., "12m"
    nextEventName?: string;
}

export const HorizonLine = ({ status, timeToImpact, nextEventName }: HorizonLineProps) => {
    return (
        <div className="w-full max-w-3xl mx-auto flex flex-col items-center justify-end pb-12 opacity-80">
            {/* The Rail */}
            <div className="w-full h-[1px] bg-gradient-to-r from-transparent via-white/20 to-transparent relative">

                {/* The Marker (Projectile) */}
                <motion.div
                    initial={{ x: "-50%" }}
                    animate={{
                        x: status === "IMMINENT" ? "10%" : status === "DISTANT" ? "-20%" : "0%",
                        opacity: status === "CLEAR" ? 0 : 1
                    }}
                    transition={{ duration: 1.5, type: "spring" }}
                    className="absolute top-1/2 -translate-y-1/2 left-1/2 flex flex-col items-center"
                >
                    {/* Tick Mark */}
                    <div className={`w-[2px] h-3 ${status === "IMMINENT" ? "bg-amber-400" : "bg-white/50"}`} />

                    {/* Label */}
                    <div className="mt-2 flex flex-col items-center">
                        <span className={`text-xs font-mono font-bold ${status === "IMMINENT" ? "text-amber-400" : "text-white/70"}`}>
                            {timeToImpact}
                        </span>
                        {nextEventName && (
                            <span className="text-[10px] uppercase tracking-wider text-white/30 whitespace-nowrap mt-0.5">
                                {nextEventName}
                            </span>
                        )}
                    </div>
                </motion.div>
            </div>

            {/* Horizon Status Text (Subtle) */}
            <div className="mt-6 text-[10px] uppercase tracking-[0.3em] text-white/20">
                {status === "CLEAR" ? "No Inbound" : "Horizon Scan"}
            </div>
        </div>
    );
};
