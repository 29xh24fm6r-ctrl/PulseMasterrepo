'use client';

import React from 'react';
import { PulseSegment } from './PulseSegment';
import { PulseSystemId } from './PulseColorMap';
import ChefGoTimeChip from '@/components/system/ChefGoTimeChip';

const SYSTEMS: PulseSystemId[] = ['focus', 'time', 'work', 'people', 'memory', 'commitments'];

export const PulseSystemStrip: React.FC = () => {
    return (
        <div className="w-full flex gap-4 px-8 py-4 z-20 items-center">
            {SYSTEMS.map((sys) => (
                <PulseSegment key={sys} system={sys} intensity={Math.random()} />
            ))}
            <div className="ml-auto">
                <ChefGoTimeChip />
            </div>
        </div>
    );
};
