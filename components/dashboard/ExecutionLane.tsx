'use client';

import React from 'react';
import { PulseSystemId, SYSTEM_COLORS } from './PulseColorMap';
import ChefTile from '@/components/dashboard/ChefTile';

interface ExecutionItem {
    id: string;
    title: string;
    system: PulseSystemId;
    time?: string;
}

const DEMO_TASKS: ExecutionItem[] = [
    { id: '1', title: 'Review Q3 Goals', system: 'work', time: '10:00 AM' },
    { id: '2', title: 'Call with Sarah', system: 'people', time: '2:00 PM' },
    { id: '3', title: 'Deep Work Session', system: 'focus', time: 'Now' },
    { id: '4', title: 'Gym', system: 'focus', time: '5:30 PM' },
];

export const ExecutionLane: React.FC = () => {
    return (
        <div className="w-[320px] h-full flex flex-col pt-8 pr-8 pb-8 gap-6 z-20">
            {/* Phase 6: Pulse Chef Tile */}
            <ChefTile />

            <h3 className="text-xs font-bold text-white/40 uppercase tracking-widest px-2">Execution Queue</h3>

            <div className="flex flex-col gap-3">
                {DEMO_TASKS.map((task) => {
                    const colors = SYSTEM_COLORS[task.system];
                    return (
                        <div
                            key={task.id}
                            className={`
                group
                relative p-4 rounded-xl
                bg-white/5 border border-white/5
                hover:bg-white/10 transition-colors
                cursor-pointer
              `}
                        >
                            {/* Left Color Bar */}
                            <div className={`absolute left-0 top-3 bottom-3 w-1 rounded-r-full bg-gradient-to-b ${colors.gradient} opacity-70`} />

                            <div className="pl-3">
                                <div className="flex justify-between items-start mb-1">
                                    <span className="text-sm font-medium text-slate-200 group-hover:text-white transition-colors">
                                        {task.title}
                                    </span>
                                </div>
                                {task.time && (
                                    <span className="text-xs text-white/30 font-mono">
                                        {task.time}
                                    </span>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Empty State / Space */}
            <div className="flex-1 rounded-xl border border-white/5 border-dashed bg-white/[0.02] flex items-center justify-center opacity-50">
                <span className="text-xs text-white/20">Flow State Active</span>
            </div>
        </div>
    );
};
