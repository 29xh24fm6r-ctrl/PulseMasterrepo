'use client';

import React from 'react';
import { motion } from 'framer-motion';

export const LoadClusters: React.FC = () => {
    // Simulating load with abstract floating orbs
    return (
        <div className="absolute inset-0 pointer-events-none">
            {[...Array(5)].map((_, i) => (
                <motion.div
                    key={i}
                    className="absolute w-32 h-32 rounded-full bg-amber-500/10 blur-3xl"
                    initial={{
                        x: Math.random() * 500,
                        y: Math.random() * 300
                    }}
                    animate={{
                        x: [null, Math.random() * 800, Math.random() * 500],
                        y: [null, Math.random() * 400, Math.random() * 300],
                        scale: [1, 1.5, 1],
                    }}
                    transition={{
                        duration: 20 + Math.random() * 10,
                        repeat: Infinity,
                        repeatType: "mirror",
                        ease: "easeInOut",
                    }}
                />
            ))}
        </div>
    );
};
