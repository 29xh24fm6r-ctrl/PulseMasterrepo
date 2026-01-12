'use client';

import React from 'react';
import { motion } from 'framer-motion';

interface EnergyLinkProps {
    startX: number;
    startY: number;
    endX: number;
    endY: number;
    color: string;
}

// "Connection paths brighten" on hover (handled by parent or CSS if possible, simplifying for v1)

export const EnergyLink: React.FC<EnergyLinkProps> = ({ startX, startY, endX, endY, color }) => {
    // Simple SVG line
    return (
        <svg className="absolute top-0 left-0 w-full h-full pointer-events-none z-0">
            <motion.line
                initial={{ pathLength: 0, opacity: 0 }}
                animate={{ pathLength: 1, opacity: 0.3 }}
                transition={{ duration: 2, ease: "easeInOut" }}
                x1={startX}
                y1={startY}
                x2={endX}
                y2={endY}
                stroke={color}
                strokeWidth="2"
                strokeLinecap="round"
                className="drop-shadow-[0_0_8px_rgba(255,255,255,0.2)]"
            />
        </svg>
    );
};
