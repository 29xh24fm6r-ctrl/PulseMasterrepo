// Global Design System v3 - Colors
// design-system/colors.ts
// Revolutionary light-based palette with glassmorphism

export const colors = {
  // Background layers (ULTRA-LIGHT)
  background: {
    base: "rgb(250, 250, 252)", // Ultra-light neutral
    elevated: "rgb(255, 255, 255)", // Pure white for elevation
    gradient: {
      calm: "linear-gradient(135deg, rgb(250, 250, 252) 0%, rgb(245, 247, 250) 100%)",
      energized: "linear-gradient(135deg, rgb(250, 252, 255) 0%, rgb(240, 248, 255) 100%)",
      stressed: "linear-gradient(135deg, rgb(255, 250, 245) 0%, rgb(255, 247, 237) 100%)",
      happy: "linear-gradient(135deg, rgb(250, 255, 250) 0%, rgb(245, 255, 245) 100%)",
      low: "linear-gradient(135deg, rgb(248, 248, 250) 0%, rgb(245, 245, 247) 100%)",
    },
  },

  // Glassmorphic panels
  glass: {
    panel: "rgba(255, 255, 255, 0.7)", // Main glass panels
    panelHover: "rgba(255, 255, 255, 0.85)", // Hover state
    elevated: "rgba(255, 255, 255, 0.9)", // Elevated glass
    subtle: "rgba(255, 255, 255, 0.5)", // Subtle glass
    backdrop: "rgba(255, 255, 255, 0.1)", // Backdrop blur
  },

  // Accent colors (BRIGHT & VIBRANT)
  accent: {
    purple: "rgb(139, 92, 246)", // Pulse Bright Purple
    pink: "rgb(236, 72, 153)", // Neon Pink
    orange: "rgb(251, 146, 60)", // Cyber Orange
    cyan: "rgb(6, 182, 212)", // Electric Cyan
    blue: "rgb(59, 130, 246)", // Pulse Blue
  },

  // Text colors (DARK on light background)
  text: {
    primary: "rgb(15, 23, 42)", // Dark slate
    secondary: "rgb(71, 85, 105)", // Medium slate
    tertiary: "rgb(148, 163, 184)", // Light slate
    inverse: "rgb(255, 255, 255)", // White for dark surfaces
    accent: "rgb(139, 92, 246)", // Purple accent text
  },

  // Border colors
  border: {
    default: "rgba(15, 23, 42, 0.1)", // Subtle borders
    hover: "rgba(139, 92, 246, 0.3)", // Purple on hover
    focus: "rgba(139, 92, 246, 0.5)", // Purple focus ring
    glass: "rgba(255, 255, 255, 0.2)", // Glass border
  },

  // Emotional variants (REACTIVE)
  emotion: {
    calm: {
      primary: "rgb(59, 130, 246)", // Soft blue
      secondary: "rgb(96, 165, 250)", // Light blue
      gradient: "linear-gradient(135deg, rgb(59, 130, 246) 0%, rgb(139, 92, 246) 100%)",
      glow: "rgba(59, 130, 246, 0.2)",
    },
    stressed: {
      primary: "rgb(251, 146, 60)", // Warm amber
      secondary: "rgb(253, 186, 116)", // Light amber
      gradient: "linear-gradient(135deg, rgb(251, 146, 60) 0%, rgb(245, 158, 11) 100%)",
      glow: "rgba(251, 146, 60, 0.15)",
    },
    energized: {
      primary: "rgb(6, 182, 212)", // Electric cyan
      secondary: "rgb(34, 211, 238)", // Bright cyan
      gradient: "linear-gradient(135deg, rgb(6, 182, 212) 0%, rgb(34, 211, 238) 100%)",
      glow: "rgba(6, 182, 212, 0.25)",
    },
    happy: {
      primary: "rgb(34, 197, 94)", // Success green
      secondary: "rgb(74, 222, 128)", // Light green
      gradient: "linear-gradient(135deg, rgb(34, 197, 94) 0%, rgb(74, 222, 128) 100%)",
      glow: "rgba(34, 197, 94, 0.2)",
    },
    confident: {
      primary: "rgb(139, 92, 246)", // Purple
      secondary: "rgb(167, 139, 250)", // Light purple
      gradient: "linear-gradient(135deg, rgb(139, 92, 246) 0%, rgb(236, 72, 153) 100%)",
      glow: "rgba(139, 92, 246, 0.3)",
    },
    low: {
      primary: "rgb(113, 113, 122)", // Muted gray
      secondary: "rgb(161, 161, 170)", // Light gray
      gradient: "linear-gradient(135deg, rgb(113, 113, 122) 0%, rgb(161, 161, 170) 100%)",
      glow: "rgba(113, 113, 122, 0.1)",
    },
  },

  // Status colors
  status: {
    success: "rgb(34, 197, 94)",
    warning: "rgb(251, 146, 60)",
    error: "rgb(239, 68, 68)",
    info: "rgb(59, 130, 246)",
  },

  // Scene-specific colors
  scene: {
    life: {
      primary: "rgb(139, 92, 246)",
      secondary: "rgb(236, 72, 153)",
      gradient: "linear-gradient(135deg, rgb(139, 92, 246) 0%, rgb(236, 72, 153) 100%)",
    },
    productivity: {
      primary: "rgb(6, 182, 212)",
      secondary: "rgb(59, 130, 246)",
      gradient: "linear-gradient(135deg, rgb(6, 182, 212) 0%, rgb(59, 130, 246) 100%)",
    },
    work: {
      primary: "rgb(59, 130, 246)",
      secondary: "rgb(34, 211, 238)",
      gradient: "linear-gradient(135deg, rgb(59, 130, 246) 0%, rgb(34, 211, 238) 100%)",
    },
    wellness: {
      primary: "rgb(34, 197, 94)",
      secondary: "rgb(74, 222, 128)",
      gradient: "linear-gradient(135deg, rgb(34, 197, 94) 0%, rgb(74, 222, 128) 100%)",
    },
    growth: {
      primary: "rgb(139, 92, 246)",
      secondary: "rgb(251, 146, 60)",
      gradient: "linear-gradient(135deg, rgb(139, 92, 246) 0%, rgb(251, 146, 60) 100%)",
    },
    dojo: {
      primary: "rgb(236, 72, 153)",
      secondary: "rgb(139, 92, 246)",
      gradient: "linear-gradient(135deg, rgb(236, 72, 153) 0%, rgb(139, 92, 246) 100%)",
    },
  },
} as const;

export type ColorKey = keyof typeof colors;
export type EmotionKey = keyof typeof colors.emotion;
export type SceneKey = keyof typeof colors.scene;
