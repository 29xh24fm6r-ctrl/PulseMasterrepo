export type NerveState = 'calm' | 'active' | 'tension' | 'overload' | 'idle';
export type PulseZoneId = 'focus' | 'time' | 'people' | 'work' | 'memory' | 'tasks';

interface ZoneColors {
    primary: string; // The core hue
    gradientStart: string;
    gradientEnd: string;
    glow: string;
}

// "Color = state and intensity"
// "Color lives inside the glass"
// "No flat fills"

export const STATE_INTENSITY: Record<NerveState, number> = {
    calm: 0.6,
    active: 0.8,
    tension: 0.9,
    overload: 1.0,
    idle: 0.3,
};

export const ZONE_COLORS: Record<PulseZoneId, ZoneColors> = {
    focus: {
        // Blue -> Green
        primary: 'from-blue-500 to-green-400',
        gradientStart: '#3b82f6', // blue-500
        gradientEnd: '#4ade80',   // green-400
        glow: 'rgba(59, 130, 246, 0.5)',
    },
    time: {
        // Cyan
        primary: 'from-cyan-400 to-cyan-600',
        gradientStart: '#22d3ee', // cyan-400
        gradientEnd: '#0891b2',   // cyan-600
        glow: 'rgba(34, 211, 238, 0.5)',
    },
    people: {
        // Teal
        primary: 'from-teal-400 to-teal-600',
        gradientStart: '#2dd4bf', // teal-400
        gradientEnd: '#0d9488',   // teal-600
        glow: 'rgba(45, 212, 191, 0.5)',
    },
    work: {
        // Amber
        primary: 'from-amber-400 to-amber-600',
        gradientStart: '#fbbf24', // amber-400
        gradientEnd: '#d97706',   // amber-600
        glow: 'rgba(251, 191, 36, 0.5)',
    },
    memory: {
        // Violet
        primary: 'from-violet-400 to-violet-600',
        gradientStart: '#a78bfa', // violet-400
        gradientEnd: '#7c3aed',   // violet-600
        glow: 'rgba(167, 139, 250, 0.5)',
    },
    tasks: {
        // Orange
        primary: 'from-orange-400 to-orange-600',
        gradientStart: '#fb923c', // orange-400
        gradientEnd: '#ea580c',   // orange-600
        glow: 'rgba(251, 146, 60, 0.5)',
    },
};

export const CORE_GRADIENTS: Record<NerveState, string> = {
    calm: 'from-indigo-900 via-blue-900 to-slate-900',
    active: 'from-blue-600 via-indigo-600 to-purple-600',
    tension: 'from-orange-500 via-red-500 to-amber-500',
    overload: 'from-red-600 via-rose-600 to-pink-600',
    idle: 'from-slate-800 via-gray-800 to-zinc-800',
};
