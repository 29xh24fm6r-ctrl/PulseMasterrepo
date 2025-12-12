// Pulse Theme Engine - Theme Loader
// lib/theme-engine/loader.ts

import { ThemePack, ThemeId } from "./types";
import { getThemePack, getThemeByPersona } from "./themes";
import { create } from "zustand";

interface ThemeState {
  currentTheme: ThemePack;
  previousTheme: ThemePack | null;
  transitionInProgress: boolean;
  setTheme: (themeId: ThemeId) => void;
  setThemeByPersona: (persona: string) => void;
  getThemeCSS: () => Record<string, string>;
}

export const useThemeStore = create<ThemeState>((set, get) => ({
  currentTheme: getThemePack("strategist"),
  previousTheme: null,
  transitionInProgress: false,

  setTheme: (themeId: ThemeId) => {
    const current = get().currentTheme;
    const newTheme = getThemePack(themeId);

    set({
      previousTheme: current,
      currentTheme: newTheme,
      transitionInProgress: true,
    });

    // Clear transition flag after animation
    setTimeout(() => {
      set({ transitionInProgress: false });
    }, 500);
  },

  setThemeByPersona: (persona: string) => {
    const current = get().currentTheme;
    const newTheme = getThemeByPersona(persona);

    set({
      previousTheme: current,
      currentTheme: newTheme,
      transitionInProgress: true,
    });

    setTimeout(() => {
      set({ transitionInProgress: false });
    }, 500);
  },

  getThemeCSS: () => {
    const theme = get().currentTheme;
    return {
      "--theme-surface1": theme.colors.surface1,
      "--theme-surface2": theme.colors.surface2,
      "--theme-surface3": theme.colors.surface3,
      "--theme-accent-primary": theme.colors.accent.primary,
      "--theme-accent-secondary": theme.colors.accent.secondary,
      "--theme-accent-tertiary": theme.colors.accent.tertiary,
      "--theme-text-primary": theme.colors.text.primary,
      "--theme-text-secondary": theme.colors.text.secondary,
      "--theme-text-tertiary": theme.colors.text.tertiary,
      "--theme-border": theme.colors.border,
      "--theme-card-radius": theme.shapes.cardRadius,
      "--theme-button-radius": theme.shapes.buttonRadius,
      "--theme-input-radius": theme.shapes.inputRadius,
      "--theme-motion-speed": theme.motion.speed,
      "--theme-motion-easing": theme.motion.easing,
    };
  },
}));

/**
 * Apply theme to document
 */
export function applyTheme(theme: ThemePack) {
  const root = document.documentElement;
  const css = {
    "--theme-surface1": theme.colors.surface1,
    "--theme-surface2": theme.colors.surface2,
    "--theme-surface3": theme.colors.surface3,
    "--theme-accent-primary": theme.colors.accent.primary,
    "--theme-accent-secondary": theme.colors.accent.secondary,
    "--theme-accent-tertiary": theme.colors.accent.tertiary,
    "--theme-text-primary": theme.colors.text.primary,
    "--theme-text-secondary": theme.colors.text.secondary,
    "--theme-text-tertiary": theme.colors.text.tertiary,
    "--theme-border": theme.colors.border,
    "--theme-card-radius": theme.shapes.cardRadius,
    "--theme-button-radius": theme.shapes.buttonRadius,
    "--theme-input-radius": theme.shapes.inputRadius,
  };

  for (const [key, value] of Object.entries(css)) {
    root.style.setProperty(key, value);
  }
}

/**
 * Transition between themes
 */
export function transitionTheme(
  fromTheme: ThemePack,
  toTheme: ThemePack,
  duration: number = 500
): Promise<void> {
  return new Promise((resolve) => {
    // Apply transition styles
    const root = document.documentElement;
    root.style.transition = `all ${duration}ms ${toTheme.motion.easing}`;

    // Apply new theme
    applyTheme(toTheme);

    // Clear transition after animation
    setTimeout(() => {
      root.style.transition = "";
      resolve();
    }, duration);
  });
}



