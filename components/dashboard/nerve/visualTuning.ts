import { SystemStateLevel } from "@/lib/nerve/types";

interface TuningParams {
    saturation: string; // Tailwind class
    opacity: number;
    blur: string; // CSS value 
    motionSpeed: number; // Multiplier
    glowIntensity: string; // Tailwind shadow class
    pulseInterval: number; // Seconds
}

export const VISUAL_TUNING: Record<SystemStateLevel, TuningParams> = {
    idle: {
        saturation: 'saturate-50',
        opacity: 0.5,
        blur: '0px',
        motionSpeed: 0.2, // Very slow drift
        glowIntensity: 'shadow-none',
        pulseInterval: 8,
    },
    calm: {
        saturation: 'saturate-100',
        opacity: 0.8,
        blur: '10px',
        motionSpeed: 1, // Normal "breathing"
        glowIntensity: 'shadow-sm',
        pulseInterval: 4,
    },
    active: {
        saturation: 'saturate-125',
        opacity: 1,
        blur: '16px',
        motionSpeed: 1.5, // Engaged
        glowIntensity: 'shadow-md',
        pulseInterval: 3,
    },
    hot: {
        saturation: 'saturate-150',
        opacity: 1,
        blur: '24px',
        motionSpeed: 2.5, // Fast flow
        glowIntensity: 'shadow-lg',
        pulseInterval: 1.5,
    },
    critical: {
        saturation: 'saturate-200',
        opacity: 1,
        blur: '32px',
        motionSpeed: 4, // Urgent, tight vibration/flow
        glowIntensity: 'shadow-2xl',
        pulseInterval: 0.8,
    },
};
