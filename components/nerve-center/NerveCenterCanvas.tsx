'use client';

import React, { useState, useEffect } from 'react';
import { PulseCore } from './PulseCore';
import { PulseZone } from './PulseZone';
import { EnergyLink } from './EnergyLink';
import { NerveState, PulseZoneId, ZONE_COLORS } from './colorStateMap';
import { motion } from 'framer-motion';

// Hardcoded for v1 balanced system layout
const ZONES: PulseZoneId[] = ['focus', 'time', 'people', 'work', 'memory', 'tasks'];
const RADIUS = 300; // Distance from center

export const NerveCenterCanvas: React.FC = () => {
    // In a real app, this state would come from a context or prop
    const [systemState] = useState<NerveState>('active');
    const [dimensions, setDimensions] = useState({ width: 0, height: 0 });

    useEffect(() => {
        // Client-side only dimension setting
        setDimensions({
            width: window.innerWidth,
            height: window.innerHeight,
        });

        const handleResize = () => {
            setDimensions({
                width: window.innerWidth,
                height: window.innerHeight,
            });
        }

        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    const centerX = dimensions.width / 2;
    const centerY = dimensions.height / 2;

    // Calculate zone positions
    const zonePositions = ZONES.map((zone, index) => {
        const angle = (index / ZONES.length) * 2 * Math.PI - Math.PI / 2; // Start from top (-90deg)
        const x = centerX + RADIUS * Math.cos(angle);
        const y = centerY + RADIUS * Math.sin(angle);
        return { id: zone, x, y };
    });

    if (dimensions.width === 0) return null; // Avoid hydration mismatch

    return (
        <div className="relative w-screen h-screen bg-slate-950 overflow-hidden flex items-center justify-center">
            {/* 2.1 Root Canvas - Dark gradient & Noise */}
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-indigo-950 via-slate-950 to-black z-0" />
            <div className="absolute inset-0 bg-[url('/noise.png')] opacity-5 z-0 pointer-events-none" />

            {/* Energy Links (Behind zones) */}
            {zonePositions.map((pos) => (
                <EnergyLink
                    key={`link-${pos.id}`}
                    startX={centerX}
                    startY={centerY}
                    endX={pos.x}
                    endY={pos.y}
                    color={ZONE_COLORS[pos.id].gradientStart}
                />
            ))}

            {/* 2.3 System Zones (Surrounding Regions) */}
            {zonePositions.map((pos, index) => (
                <PulseZone
                    key={pos.id}
                    id={pos.id}
                    index={index}
                    state={systemState}
                    style={{
                        left: pos.x - 80, // Center offset (w-40 = 160px => 80px center)
                        top: pos.y - 80,
                    }}
                />
            ))}

            {/* 2.2 Central Pulse Core */}
            <div className="z-10">
                <PulseCore state={systemState} />
            </div>
        </div>
    );
};
