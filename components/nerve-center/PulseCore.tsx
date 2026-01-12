'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { NerveState, CORE_GRADIENTS } from './colorStateMap';
import { breatheVariant } from './MotionSystem';
import { GlassMaterials } from './GlassMaterial';

interface PulseCoreProps {
    state?: NerveState;
}

export const PulseCore: React.FC<PulseCoreProps> = ({ state = 'active' }) => {
    const gradient = CORE_GRADIENTS[state];

    return (
        <div className="relative flex items-center justify-center w-64 h-64 z-50">
            {/* Outer Glow / Atmospheric Bleed */}
            <motion.div
                variants={breatheVariant}
                initial="initial"
                animate="animate"
                className={`absolute inset-0 bg-gradient-to-tr ${gradient} blur-3xl opacity-40 rounded-full`}
            />

            {/* Main Glass Core */}
            <motion.div
                variants={breatheVariant}
                initial="initial"
                animate="animate" // Default speed
                className={`
          w-48 h-48
          rounded-full
          bg-gradient-to-br ${gradient}
          ${GlassMaterials.core}
          relative
          flex items-center justify-center
          overflow-hidden
        `}
            >
                {/* Inner Liquid Highlight */}
                <div className={GlassMaterials.innerLight} />

                {/* Internal Organic Noise / Texture (Simulated with gradient overlay) */}
                <div className="absolute inset-0 bg-[url('/noise.png')] opacity-20 mix-blend-overlay" />

                {/* Core "Heartbeat" Center */}
                <div className={`w-16 h-16 rounded-full bg-white/20 blur-xl`} />
            </motion.div>
        </div>
    );
};
