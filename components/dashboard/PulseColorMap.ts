export type PulseSystemId = 'focus' | 'time' | 'work' | 'people' | 'memory' | 'commitments';
export type GlobalState = 'calm' | 'active' | 'overloaded' | 'idle';

export const SYSTEM_COLORS: Record<PulseSystemId, {
    label: string;
    gradient: string;
    glow: string;
    dot: string; // Tailwind class for the nav dot
}> = {
    focus: {
        label: 'Focus & Energy',
        gradient: 'from-blue-500 to-green-400',
        glow: 'shadow-blue-500/50',
        dot: 'bg-blue-500',
    },
    time: {
        label: 'Time & Schedule',
        gradient: 'from-cyan-400 to-cyan-600',
        glow: 'shadow-cyan-400/50',
        dot: 'bg-cyan-400',
    },
    work: {
        label: 'Work & Execution',
        gradient: 'from-amber-400 to-amber-600',
        glow: 'shadow-amber-400/50',
        dot: 'bg-amber-500',
    },
    people: {
        label: 'People & Relationships',
        gradient: 'from-teal-400 to-teal-600',
        glow: 'shadow-teal-400/50',
        dot: 'bg-teal-400',
    },
    memory: {
        label: 'Memory & Knowledge',
        gradient: 'from-violet-400 to-violet-600',
        glow: 'shadow-violet-400/50',
        dot: 'bg-violet-500',
    },
    commitments: {
        label: 'Commitments',
        gradient: 'from-orange-400 to-orange-600',
        glow: 'shadow-orange-400/50',
        dot: 'bg-orange-500',
    },
};

export const STATE_STYLES: Record<GlobalState, {
    saturation: string; // Tailwind saturate class
    opacity: string;
}> = {
    calm: { saturation: 'saturate-100', opacity: 'opacity-80' },
    active: { saturation: 'saturate-125', opacity: 'opacity-100' },
    overloaded: { saturation: 'saturate-150', opacity: 'opacity-100' },
    idle: { saturation: 'saturate-50', opacity: 'opacity-60' },
};
