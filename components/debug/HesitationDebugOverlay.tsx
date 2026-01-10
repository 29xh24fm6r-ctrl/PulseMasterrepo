'use client';

import React from 'react';
import { useHesitationContext } from '@/hooks/useHesitation';
import { EngagementState } from '@/hooks/hesitation-types';

const StateColors: Record<EngagementState, string> = {
    FLOW: '#10B981', // green-500
    BROWSING: '#3B82F6', // blue-500
    STUCK: '#F59E0B', // amber-500
    AVOIDING: '#EF4444', // red-500
    OVERWHELMED: '#8B5CF6', // violet-500
};

export function HesitationDebugOverlay() {
    const { signal, telemetry } = useHesitationContext();

    // Only show in development or if explicitly enabled
    if (process.env.NODE_ENV === 'production') return null;

    return (
        <div className="fixed bottom-4 right-4 z-[9999] p-4 bg-black/80 backdrop-blur-md rounded-xl text-xs font-mono text-white border border-white/10 shadow-2xl w-64 pointer-events-none select-none trasition-all duration-300">
            <div className="flex justify-between items-center mb-2 border-b border-white/10 pb-2">
                <span className="font-bold text-gray-400">PULSE SENSOR</span>
                <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full animate-pulse" style={{ backgroundColor: StateColors[signal.state] }} />
                    <span style={{ color: StateColors[signal.state] }} className="font-bold">{signal.state}</span>
                </div>
            </div>

            <div className="space-y-1.5 opacity-90">
                <div className="flex justify-between">
                    <span className="text-gray-500">Hesitation</span>
                    <div className="w-24 bg-gray-800 rounded-full h-1.5 mt-1.5 ml-2 overflow-hidden">
                        <div className="h-full rounded-full transition-all duration-500 ease-out" style={{ width: `${signal.hesitationScore * 100}%`, backgroundColor: signal.hesitationScore > 0.7 ? '#EF4444' : '#fff' }} />
                    </div>
                </div>

                <div className="flex justify-between">
                    <span className="text-gray-500">Target</span>
                    <span className="text-cyan-400 truncate max-w-[120px]">{signal.primaryTargetId || 'None'}</span>
                </div>

                <div className="grid grid-cols-2 gap-2 mt-2 pt-2 border-t border-white/10 text-[10px] text-gray-500">
                    <div>
                        Dwell: <span className="text-white">{telemetry.dwellMs}ms</span>
                    </div>
                    <div>
                        Revisits: <span className="text-white">{telemetry.revisitCount}</span>
                    </div>
                    <div>
                        Velocity: <span className="text-white">{telemetry.scrollVelocity.toFixed(1)}</span>
                    </div>
                    <div>
                        Hover: <span className="text-white">{telemetry.hoverCount}</span>
                    </div>
                </div>
            </div>
        </div>
    );
}
