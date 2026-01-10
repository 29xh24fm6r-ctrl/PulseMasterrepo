"use client";

import { motion } from "framer-motion";

interface TimeBlock {
    id: string;
    label: string;
    time: string;
    status: "PAST" | "CURRENT" | "FUTURE";
}

interface TimeStreamProps {
    blocks: TimeBlock[];
}

export const TimeStream = ({ blocks }: TimeStreamProps) => {
    return (
        <div className="h-full flex flex-col justify-center py-12 relative w-64 pl-8">
            {/* The Rail */}
            <div className="absolute left-8 top-0 bottom-0 w-[1px] bg-white/10" />

            {/* The 'NOW' Beam */}
            <motion.div
                className="absolute left-8 top-1/2 w-[2px] h-24 -translate-y-1/2 bg-gradient-to-b from-transparent via-emerald-500 to-transparent shadow-[0_0_15px_rgba(16,185,129,0.5)] z-10"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 96 }}
                transition={{ duration: 1.5, delay: 0.5 }}
            />

            {/* Time Blocks */}
            <div className="flex flex-col gap-12 relative z-0">
                {blocks.map((block, index) => (
                    <motion.div
                        key={block.id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: block.status === "PAST" ? 0.3 : block.status === "CURRENT" ? 1 : 0.5, x: 0 }}
                        transition={{ delay: index * 0.1 }}
                        className={`flex gap-6 items-center ${block.status === "CURRENT" ? "scale-105 origin-left" : ""}`}
                    >
                        {/* Node */}
                        <div className={`w-2 h-2 rounded-full -ml-[5px] relative z-20 ${block.status === "CURRENT" ? "bg-white shadow-[0_0_10px_white]" :
                                block.status === "FUTURE" ? "bg-zinc-800 border border-zinc-600" : "bg-zinc-800"
                            }`} />

                        {/* Text */}
                        <div className="flex flex-col">
                            <span className={`font-mono text-xs mb-1 ${block.status === "CURRENT" ? "text-emerald-400" : "text-zinc-600"
                                }`}>
                                {block.time}
                            </span>
                            <span className={`text-sm tracking-wide ${block.status === "CURRENT" ? "text-white font-medium" : "text-zinc-500"
                                }`}>
                                {block.label}
                            </span>
                        </div>
                    </motion.div>
                ))}
            </div>

        </div>
    );
};
