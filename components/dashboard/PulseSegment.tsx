'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { PulseSystemId, SYSTEM_COLORS } from './PulseColorMap';

interface PulseSegmentProps {
    system: PulseSystemId;
    intensity?: number; // 0-1
}

export const PulseSegment: React.FC<PulseSegmentProps> = ({ system, intensity = 0.5 }) => {
    const colors = SYSTEM_COLORS[system];

    return (
        <motion.div
            className={`
        relative h-16 flex-1 min-w-[100px]
        rounded-xl
        backdrop-blur-xl bg-white/5 border border-white/5
        flex items-center justify-center gap-3
        cursor-pointer
        group overflow-hidden
        hover:bg-white/10 transition-colors
      `}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
        >
            {/* Inner Light Gradient */}
            <div className={`absolute inset-0 bg-gradient-to-br ${colors.gradient} opacity-0 group-hover:opacity-20 transition-opacity duration-500`} />

            {/* Active Glow Bar (Intensity Indicator) */}
            <div
                className={`absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r ${colors.gradient}`}
                style={{ opacity: 0.3 + (intensity * 0.7) }}
            />

            {/* Icon Placeholder (Visual Only) */}
            <div className={`
        w-8 h-8 rounded-full 
        bg-gradient-to-tr ${colors.gradient}
        flex items-center justify-center
        shadow-lg ${colors.glow}
      `}>
                <div className="w-3 h-3 bg-white/50 rounded-full" />
            </div>

            {/* Label (Hidden by default, visual only per spec, but good for dev verification) */}
            {/* <span className="text-xs font-medium text-white/50 group-hover:text-white transition-colors">
        {colors.label.split(' ')[0]}
      </span> */}

            {/* Pulse Animation */}
            <motion.div
                className={`absolute inset-0 bg-white/5`}
                initial={{ opacity: 0 }}
                animate={{ opacity: [0, 0.1, 0] }}
                transition={{ duration: 4, repeat: Infinity, ease: "easeInOut", delay: Math.random() * 2 }}
            />
        </motion.div>
    );
};
