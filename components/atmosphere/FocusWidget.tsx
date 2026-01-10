"use client";

import { motion } from "framer-motion";
import { Circle, Play } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

export function FocusWidget() {
    const [isActive, setIsActive] = useState(false);

    // Future: Hook into real Focus Context
    const toggleFocus = () => {
        setIsActive(!isActive);
        if (!isActive) {
            toast.success("Focus Mode Engage.");
        } else {
            toast.info("Focus Paused.");
        }
    };

    return (
        <motion.button
            onClick={toggleFocus}
            className={`
        flex items-center gap-2 px-3 py-1.5
        rounded-full border backdrop-blur-md
        transition-all duration-500
        ${isActive
                    ? 'bg-violet-500/20 border-violet-500/30 text-violet-200'
                    : 'bg-white/5 border-white/10 text-zinc-500 hover:text-zinc-300 hover:bg-white/10'}
      `}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
        >
            {isActive ? (
                <div className="flex items-center gap-2">
                    <div className="relative">
                        <div className="absolute inset-0 bg-violet-400 animate-ping rounded-full opacity-20" />
                        <Circle className="w-3 h-3 text-violet-400 fill-violet-400" />
                    </div>
                    <span className="text-xs font-medium tracking-wide">24:59</span>
                </div>
            ) : (
                <div className="flex items-center gap-2">
                    <Play className="w-3 h-3" />
                    <span className="text-[10px] uppercase tracking-wider font-medium">Focus</span>
                </div>
            )}
        </motion.button>
    );
}
