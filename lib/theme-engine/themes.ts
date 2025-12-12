// Pulse Theme Engine - Theme Packs
// lib/theme-engine/themes.ts

import { ThemePack, ThemeId } from "./types";

export const themePacks: Record<ThemeId, ThemePack> = {
  strategist: {
    id: "strategist",
    name: "Strategist Mode",
    description: "Dark, sharp, neon edges",
    persona: "strategic",
    colors: {
      surface1: "rgb(9, 9, 11)",
      surface2: "rgb(20, 20, 24)",
      surface3: "rgb(30, 30, 36)",
      accent: {
        primary: "rgb(6, 182, 212)", // Electric cyan
        secondary: "rgb(59, 130, 246)", // Pulse blue
        tertiary: "rgb(139, 92, 246)", // Horizon purple
      },
      text: {
        primary: "rgb(250, 250, 250)",
        secondary: "rgb(161, 161, 170)",
        tertiary: "rgb(113, 113, 122)",
      },
      border: "rgba(6, 182, 212, 0.3)",
    },
    motion: {
      speed: "normal",
      easing: "cubic-bezier(0.4, 0, 0.2, 1)",
      springConfig: {
        stiffness: 400,
        damping: 25,
        mass: 0.8,
      },
    },
    shapes: {
      cardRadius: "0.5rem",
      buttonRadius: "0.375rem",
      inputRadius: "0.375rem",
    },
    elevation: {
      card: "0 4px 6px -1px rgba(0, 0, 0, 0.4)",
      panel: "0 10px 15px -3px rgba(0, 0, 0, 0.5)",
      modal: "0 20px 25px -5px rgba(0, 0, 0, 0.6)",
    },
    noiseLevel: "moderate",
  },

  mentor: {
    id: "mentor",
    name: "Mentor Mode",
    description: "Warm, soft gradients",
    persona: "warm_advisor",
    colors: {
      surface1: "rgb(15, 15, 18)",
      surface2: "rgb(28, 28, 32)",
      surface3: "rgb(42, 42, 48)",
      accent: {
        primary: "rgb(251, 191, 36)", // Warm amber
        secondary: "rgb(245, 158, 11)", // Golden
        tertiary: "rgb(217, 119, 6)", // Deep amber
      },
      text: {
        primary: "rgb(250, 250, 250)",
        secondary: "rgb(180, 180, 190)",
        tertiary: "rgb(140, 140, 150)",
      },
      border: "rgba(251, 191, 36, 0.2)",
    },
    motion: {
      speed: "slow",
      easing: "cubic-bezier(0.25, 0.1, 0.25, 1)",
      springConfig: {
        stiffness: 300,
        damping: 30,
        mass: 1,
      },
    },
    shapes: {
      cardRadius: "0.75rem",
      buttonRadius: "0.5rem",
      inputRadius: "0.5rem",
    },
    elevation: {
      card: "0 2px 4px -1px rgba(0, 0, 0, 0.3)",
      panel: "0 4px 6px -1px rgba(0, 0, 0, 0.4)",
      modal: "0 10px 15px -3px rgba(0, 0, 0, 0.5)",
    },
    noiseLevel: "minimal",
  },

  warrior: {
    id: "warrior",
    name: "Warrior Mode",
    description: "Strong reds/golds, bold typography",
    persona: "command",
    colors: {
      surface1: "rgb(12, 12, 15)",
      surface2: "rgb(24, 20, 20)",
      surface3: "rgb(36, 28, 28)",
      accent: {
        primary: "rgb(239, 68, 68)", // Strong red
        secondary: "rgb(245, 158, 11)", // Gold
        tertiary: "rgb(220, 38, 38)", // Deep red
      },
      text: {
        primary: "rgb(255, 255, 255)",
        secondary: "rgb(200, 200, 200)",
        tertiary: "rgb(150, 150, 150)",
      },
      border: "rgba(239, 68, 68, 0.4)",
    },
    motion: {
      speed: "fast",
      easing: "cubic-bezier(0.34, 1.56, 0.64, 1)",
      springConfig: {
        stiffness: 500,
        damping: 20,
        mass: 0.8,
      },
    },
    shapes: {
      cardRadius: "0.25rem",
      buttonRadius: "0.25rem",
      inputRadius: "0.25rem",
    },
    elevation: {
      card: "0 6px 8px -2px rgba(239, 68, 68, 0.3)",
      panel: "0 12px 16px -4px rgba(239, 68, 68, 0.4)",
      modal: "0 24px 32px -8px rgba(239, 68, 68, 0.5)",
    },
    noiseLevel: "high",
  },

  zen: {
    id: "zen",
    name: "Zen Mode",
    description: "Minimal, muted, calm",
    persona: "calm",
    colors: {
      surface1: "rgb(18, 18, 20)",
      surface2: "rgb(28, 28, 30)",
      surface3: "rgb(38, 38, 40)",
      accent: {
        primary: "rgb(148, 163, 184)", // Muted blue-gray
        secondary: "rgb(100, 116, 139)", // Slate
        tertiary: "rgb(71, 85, 105)", // Deep slate
      },
      text: {
        primary: "rgb(241, 245, 249)",
        secondary: "rgb(203, 213, 225)",
        tertiary: "rgb(148, 163, 184)",
      },
      border: "rgba(148, 163, 184, 0.1)",
    },
    motion: {
      speed: "slow",
      easing: "cubic-bezier(0.25, 0.1, 0.25, 1)",
      springConfig: {
        stiffness: 250,
        damping: 35,
        mass: 1.2,
      },
    },
    shapes: {
      cardRadius: "1rem",
      buttonRadius: "0.75rem",
      inputRadius: "0.75rem",
    },
    elevation: {
      card: "0 1px 2px -1px rgba(0, 0, 0, 0.2)",
      panel: "0 2px 4px -1px rgba(0, 0, 0, 0.3)",
      modal: "0 4px 6px -1px rgba(0, 0, 0, 0.4)",
    },
    noiseLevel: "minimal",
  },

  creator: {
    id: "creator",
    name: "Creator Mode",
    description: "Playful, colorful, animated",
    persona: "hype",
    colors: {
      surface1: "rgb(10, 10, 12)",
      surface2: "rgb(22, 22, 28)",
      surface3: "rgb(34, 34, 42)",
      accent: {
        primary: "rgb(168, 85, 247)", // Vibrant purple
        secondary: "rgb(236, 72, 153)", // Pink
        tertiary: "rgb(34, 211, 238)", // Cyan
      },
      text: {
        primary: "rgb(255, 255, 255)",
        secondary: "rgb(200, 200, 200)",
        tertiary: "rgb(150, 150, 150)",
      },
      border: "rgba(168, 85, 247, 0.4)",
    },
    motion: {
      speed: "fast",
      easing: "cubic-bezier(0.68, -0.55, 0.265, 1.55)",
      springConfig: {
        stiffness: 450,
        damping: 22,
        mass: 0.7,
      },
    },
    shapes: {
      cardRadius: "1rem",
      buttonRadius: "0.75rem",
      inputRadius: "0.75rem",
    },
    elevation: {
      card: "0 8px 12px -2px rgba(168, 85, 247, 0.3)",
      panel: "0 16px 24px -4px rgba(168, 85, 247, 0.4)",
      modal: "0 32px 48px -8px rgba(168, 85, 247, 0.5)",
    },
    noiseLevel: "high",
  },

  oracle: {
    id: "oracle",
    name: "Oracle Mode",
    description: "Deep, cosmic visuals",
    persona: "sage",
    colors: {
      surface1: "rgb(8, 8, 12)",
      surface2: "rgb(16, 16, 24)",
      surface3: "rgb(24, 24, 36)",
      accent: {
        primary: "rgb(139, 92, 246)", // Deep purple
        secondary: "rgb(99, 102, 241)", // Indigo
        tertiary: "rgb(59, 130, 246)", // Cosmic blue
      },
      text: {
        primary: "rgb(250, 250, 255)",
        secondary: "rgb(180, 180, 200)",
        tertiary: "rgb(120, 120, 150)",
      },
      border: "rgba(139, 92, 246, 0.3)",
    },
    motion: {
      speed: "normal",
      easing: "cubic-bezier(0.4, 0, 0.2, 1)",
      springConfig: {
        stiffness: 350,
        damping: 28,
        mass: 1,
      },
    },
    shapes: {
      cardRadius: "0.5rem",
      buttonRadius: "0.375rem",
      inputRadius: "0.375rem",
    },
    elevation: {
      card: "0 4px 8px -2px rgba(139, 92, 246, 0.2)",
      panel: "0 8px 16px -4px rgba(139, 92, 246, 0.3)",
      modal: "0 16px 32px -8px rgba(139, 92, 246, 0.4)",
    },
    noiseLevel: "moderate",
  },
};

/**
 * Get theme pack by ID
 */
export function getThemePack(themeId: ThemeId): ThemePack {
  return themePacks[themeId] || themePacks.strategist;
}

/**
 * Get theme pack by persona
 */
export function getThemeByPersona(persona: string): ThemePack {
  const personaMap: Record<string, ThemeId> = {
    strategic: "strategist",
    warm_advisor: "mentor",
    command: "warrior",
    calm: "zen",
    hype: "creator",
    sage: "oracle",
  };

  const themeId = personaMap[persona] || "strategist";
  return getThemePack(themeId);
}



