'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { PulseZoneId, NerveState, ZONE_COLORS, STATE_INTENSITY } from './colorStateMap';
import { GlassMaterials } from './GlassMaterial';
import { zoneEntranceVariant } from './MotionSystem';

interface PulseZoneProps {
    id: PulseZoneId;
    state: NerveState;
    index: number; // For staggered entrance
    style?: React.CSSProperties; // For positioning
}

export const PulseZone: React.FC<PulseZoneProps> = ({ id, state, index, style }) => {
    const colors = ZONE_COLORS[id];
    const intensity = STATE_INTENSITY[state];

    return (
        <motion.div
            custom={index}
            variants={zoneEntranceVariant}
            initial="hidden"
            animate="visible"
            style={style}
            className={`
        absolute
        w-40 h-40
        ${GlassMaterials.base}
        ${GlassMaterials.zone}
        flex items-center justify-center
        cursor-pointer
      `}
            whileHover={{ scale: 1.1, zIndex: 40 }}
        >
            {/* Zone Gradient Background */}
            <div
                className={`absolute inset-0 opacity-30 bg-gradient-to-br ${colors.primary}`}
                style={{ opacity: 0.2 + (intensity * 0.3) }}
            />

            {/* Inner Light */}
            <div className={GlassMaterials.innerLight} />

            {/* Content Placeholder (No Text for now, just visual weight) */}
            <div className={`
        w-16 h-16 rounded-full 
        bg-gradient-to-tr ${colors.primary}
        opacity-40 blur-md
        group-hover:opacity-70 transition-opacity duration-500
      `} />

        </motion.div>
    );
};
