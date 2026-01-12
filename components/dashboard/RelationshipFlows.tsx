'use client';

import React from 'react';
import { motion } from 'framer-motion';

export const RelationshipFlows: React.FC = () => {
    return (
        <svg className="absolute inset-0 w-full h-full pointer-events-none opacity-40">
            {[...Array(3)].map((_, i) => (
                <motion.path
                    key={i}
                    d={`M -100,${200 + i * 50} Q 400,${100 + i * 100} 1200,${300 + i * 50}`}
                    fill="none"
                    stroke="url(#gradient-flow)"
                    strokeWidth="2"
                    initial={{ pathLength: 0, pathOffset: 0 }}
                    animate={{
                        pathOffset: [0, 1],
                        opacity: [0.2, 0.5, 0.2]
                    }}
                    transition={{
                        duration: 10 + i * 2,
                        repeat: Infinity,
                        ease: "linear"
                    }}
                />
            ))}
            <defs>
                <linearGradient id="gradient-flow" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#2dd4bf" stopOpacity="0" />
                    <stop offset="50%" stopColor="#2dd4bf" stopOpacity="1" />
                    <stop offset="100%" stopColor="#2dd4bf" stopOpacity="0" />
                </linearGradient>
            </defs>
        </svg>
    );
};
