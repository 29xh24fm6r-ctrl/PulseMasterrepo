// Global Design System v3 - Shadows & Depth
// design-system/shadows.ts
// Optimized for light backgrounds with glassmorphism

export const shadows = {
  // Depth layers (for light backgrounds)
  z1: {
    card: "0 1px 3px 0 rgba(0, 0, 0, 0.05), 0 1px 2px -1px rgba(0, 0, 0, 0.05)",
    glow: "0 0 20px rgba(139, 92, 246, 0.08)",
    glass: "0 8px 32px 0 rgba(31, 38, 135, 0.1)",
  },
  z2: {
    card: "0 4px 6px -1px rgba(0, 0, 0, 0.08), 0 2px 4px -2px rgba(0, 0, 0, 0.08)",
    glow: "0 0 30px rgba(139, 92, 246, 0.12)",
    glass: "0 8px 32px 0 rgba(31, 38, 135, 0.15)",
  },
  z3: {
    card: "0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -4px rgba(0, 0, 0, 0.1)",
    glow: "0 0 40px rgba(139, 92, 246, 0.15)",
    glass: "0 8px 32px 0 rgba(31, 38, 135, 0.2)",
  },
  z4: {
    card: "0 20px 25px -5px rgba(0, 0, 0, 0.12), 0 8px 10px -6px rgba(0, 0, 0, 0.12)",
    glow: "0 0 50px rgba(139, 92, 246, 0.2)",
    glass: "0 8px 32px 0 rgba(31, 38, 135, 0.25)",
  },

  // Glassmorphism effects
  glass: {
    subtle: "0 8px 32px 0 rgba(31, 38, 135, 0.1)",
    medium: "0 8px 32px 0 rgba(31, 38, 135, 0.15)",
    strong: "0 8px 32px 0 rgba(31, 38, 135, 0.2)",
  },

  // Special effects
  pulse: "0 0 0 0 rgba(139, 92, 246, 0.4)",
  inner: "inset 0 2px 4px 0 rgba(0, 0, 0, 0.05)",
  
  // Emotion-based glows
  emotion: {
    calm: "0 0 30px rgba(59, 130, 246, 0.15)",
    stressed: "0 0 30px rgba(251, 146, 60, 0.12)",
    energized: "0 0 30px rgba(6, 182, 212, 0.2)",
    happy: "0 0 30px rgba(34, 197, 94, 0.15)",
    confident: "0 0 30px rgba(139, 92, 246, 0.2)",
    low: "0 0 20px rgba(113, 113, 122, 0.1)",
  },
} as const;
