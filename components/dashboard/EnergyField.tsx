'use client';

import React from 'react';
import { motion } from 'framer-motion';

export const EnergyField: React.FC = () => {
    return (
        <div className="absolute inset-x-0 bottom-0 h-1/2 overflow-hidden opacity-30 pointer-events-none">
            <motion.div
                className="absolute inset-0 bg-gradient-to-t from-blue-500/40 to-transparent"
                animate={{
                    scaleY: [1, 1.2, 1],
                    opacity: [0.3, 0.5, 0.3],
                }}
                transition={{
                    duration: 8,
                    repeat: Infinity,
                    ease: "easeInOut"
                }}
            />
            {/* Secondary Wave */}
            <motion.div
                className="absolute inset-0 bg-gradient-to-t from-green-500/30 to-transparent"
                animate={{
                    scaleY: [1.2, 1, 1.2],
                    translateY: [0, 20, 0],
                }}
                transition={{
                    duration: 12,
                    repeat: Infinity,
                    ease: "easeInOut"
                }}
            />
        </div>
    );
};
