import { Variants } from 'framer-motion';

// "Motion must be: continuous, slow, intentional, non-distracting"
// "No sharp transitions. No bouncing."

export const breatheVariant: Variants = {
    initial: { scale: 0.95, opacity: 0.8 },
    animate: (speed: number = 6) => ({
        scale: [0.95, 1.05, 0.95],
        opacity: [0.8, 1, 0.8],
        transition: {
            duration: speed,
            repeat: Infinity,
            ease: "easeInOut",
        },
    }),
};

export const driftVariant: Variants = {
    animate: {
        x: [0, 10, -10, 0],
        y: [0, -15, 5, 0],
        rotate: [0, 2, -2, 0],
        transition: {
            duration: 20,
            repeat: Infinity,
            ease: "easeInOut",
            repeatType: "mirror",
        },
    },
};

export const flowVariant: Variants = {
    animate: {
        backgroundPosition: ['0% 50%', '100% 50%', '0% 50%'],
        transition: {
            duration: 15,
            repeat: Infinity,
            ease: "linear",
        },
    },
};

export const zoneEntranceVariant: Variants = {
    hidden: { opacity: 0, scale: 0.8 },
    visible: (i: number) => ({
        opacity: 1,
        scale: 1,
        transition: {
            delay: i * 0.1,
            duration: 1.5,
            ease: "easeOut",
        },
    }),
};
