// Pulse Theme Engine Types
// lib/theme-engine/types.ts

export interface ThemePack {
  id: string;
  name: string;
  description: string;
  persona: string; // Which butler persona this theme matches

  // Color system
  colors: {
    surface1: string;
    surface2: string;
    surface3: string;
    accent: {
      primary: string;
      secondary: string;
      tertiary: string;
    };
    text: {
      primary: string;
      secondary: string;
      tertiary: string;
    };
    border: string;
  };

  // Motion
  motion: {
    speed: "slow" | "normal" | "fast";
    easing: string;
    springConfig: {
      stiffness: number;
      damping: number;
      mass: number;
    };
  };

  // Component shapes
  shapes: {
    cardRadius: string;
    buttonRadius: string;
    inputRadius: string;
  };

  // Elevation
  elevation: {
    card: string;
    panel: string;
    modal: string;
  };

  // Noise level (visual complexity)
  noiseLevel: "minimal" | "moderate" | "high";
}

export type ThemeId =
  | "strategist"
  | "mentor"
  | "warrior"
  | "zen"
  | "creator"
  | "oracle";



