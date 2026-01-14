'use client';

import React from 'react';
import { EnergyField } from './EnergyField';
import { LoadClusters } from './LoadClusters';
import { RelationshipFlows } from './RelationshipFlows';

export const LifeStateCanvas: React.FC = () => {
    return (
        <div className="relative flex-1 rounded-3xl overflow-hidden backdrop-blur-3xl bg-white/5 border border-white/10 m-8 mx-0 shadow-2xl">
            {/* Ambient Background */}
            <div className="absolute inset-0 bg-gradient-to-br from-indigo-950/50 via-slate-950/50 to-black/80 z-0" />

            {/* 5. Life State Signals */}
            <div className="absolute inset-0 z-10">
                <LoadClusters /> {/* Load - Ambient Orbs */}
                <EnergyField />  {/* Energy - Bottom Wave */}
                <RelationshipFlows /> {/* Interaction - Flow Lines */}
            </div>

            {/* Center Label (Subtle) */}
            <div className="absolute inset-0 flex items-center justify-center z-20 pointer-events-none">
                <div className="text-center opacity-30 mix-blend-overlay">
                    <h2 className="text-9xl font-bold tracking-tighter text-white/10">ALIVE</h2>
                </div>
            </div>

            {/* Grain Overlay */}
            <div className="absolute inset-0 bg-[url('/noise.png')] opacity-5 pointer-events-none z-30" />
        </div>
    );
};
