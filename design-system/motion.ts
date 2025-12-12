// Global Design System v3 - Motion System
// design-system/motion.ts
// Enhanced with scene transitions and micro-animations

export const motion = {
  // Easing functions
  ease: {
    soft: "cubic-bezier(0.4, 0, 0.2, 1)",
    smooth: "cubic-bezier(0.25, 0.1, 0.25, 1)",
    spring: "cubic-bezier(0.34, 1.56, 0.64, 1)",
    bounce: "cubic-bezier(0.68, -0.55, 0.265, 1.55)",
    elastic: "cubic-bezier(0.68, -0.6, 0.32, 1.6)",
  },

  // Duration (in milliseconds)
  duration: {
    instant: 100,
    fast: 150,
    normal: 300,
    slow: 500,
    slower: 750,
    slowest: 1000,
  },

  // Spring configurations
  spring: {
    light: {
      type: "spring" as const,
      stiffness: 300,
      damping: 30,
      mass: 0.5,
    },
    medium: {
      type: "spring" as const,
      stiffness: 400,
      damping: 25,
      mass: 0.8,
    },
    heavy: {
      type: "spring" as const,
      stiffness: 500,
      damping: 20,
      mass: 1,
    },
    bouncy: {
      type: "spring" as const,
      stiffness: 400,
      damping: 15,
      mass: 0.8,
    },
  },

  // Animation presets
  presets: {
    fadeSlideIn: {
      initial: { opacity: 0, y: 20 },
      animate: { opacity: 1, y: 0 },
      exit: { opacity: 0, y: -20 },
      transition: { duration: 0.3, ease: "easeOut" },
    },
    fadeSlideUp: {
      initial: { opacity: 0, y: 30 },
      animate: { opacity: 1, y: 0 },
      exit: { opacity: 0, y: -30 },
      transition: { duration: 0.4, ease: "easeOut" },
    },
    revealStagger: {
      initial: { opacity: 0, scale: 0.95 },
      animate: { opacity: 1, scale: 1 },
      transition: { duration: 0.4, ease: "easeOut" },
    },
    pulseGlow: {
      animate: {
        boxShadow: [
          "0 0 0 0 rgba(139, 92, 246, 0.4)",
          "0 0 0 10px rgba(139, 92, 246, 0)",
          "0 0 0 0 rgba(139, 92, 246, 0)",
        ],
      },
      transition: {
        duration: 2,
        repeat: Infinity,
        ease: "easeInOut",
      },
    },
    breathing: {
      animate: {
        scale: [1, 1.02, 1],
        opacity: [0.9, 1, 0.9],
      },
      transition: {
        duration: 3,
        repeat: Infinity,
        ease: "easeInOut",
      },
    },
    float: {
      animate: {
        y: [0, -10, 0],
      },
      transition: {
        duration: 3,
        repeat: Infinity,
        ease: "easeInOut",
      },
    },
    shimmer: {
      animate: {
        backgroundPosition: ["0% 50%", "100% 50%", "0% 50%"],
      },
      transition: {
        duration: 2,
        repeat: Infinity,
        ease: "linear",
      },
    },
    sceneTransition: {
      initial: { opacity: 0, scale: 0.98 },
      animate: { opacity: 1, scale: 1 },
      exit: { opacity: 0, scale: 1.02 },
      transition: { duration: 0.5, ease: "easeInOut" },
    },
  },
} as const;
