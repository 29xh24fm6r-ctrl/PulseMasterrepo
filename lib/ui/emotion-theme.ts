// Emotion-Reactive UI Theme Engine
// lib/ui/emotion-theme.ts

import { colors, EmotionKey } from "@/design-system/colors";
import { motion } from "@/design-system/motion";

export interface EmotionTheme {
  colors: {
    primary: string;
    secondary: string;
    gradient: string;
    background: string;
    text: string;
  };
  motion: {
    speed: "slow" | "normal" | "fast";
    transitions: typeof motion.duration;
  };
  density: "low" | "medium" | "high";
  contrast: "low" | "medium" | "high";
}

/**
 * Get emotion-based theme
 */
export function getEmotionTheme(
  emotion: string | null | undefined,
  intensity: number = 0.5
): EmotionTheme {
  // Map emotion to theme key
  let emotionKey: EmotionKey = "calm";

  if (!emotion) {
    emotionKey = "calm";
  } else if (emotion === "stressed" || emotion === "overwhelmed" || emotion === "anxious") {
    emotionKey = "stressed";
  } else if (emotion === "motivated" || emotion === "excited" || emotion === "energized") {
    emotionKey = "energized";
  } else if (emotion === "happy" || emotion === "confident" || emotion === "content") {
    emotionKey = "happy";
  } else if (emotion === "tired" || emotion === "low" || emotion === "drained") {
    emotionKey = "low";
  } else {
    emotionKey = "calm";
  }

  const emotionColors = colors.emotion[emotionKey];

  // Adjust based on intensity
  const adjustedIntensity = Math.min(1, Math.max(0, intensity));

  // Determine motion speed
  let motionSpeed: "slow" | "normal" | "fast" = "normal";
  if (emotionKey === "energized" || emotionKey === "happy") {
    motionSpeed = "fast";
  } else if (emotionKey === "low" || emotionKey === "stressed") {
    motionSpeed = "slow";
  }

  // Determine density
  let density: "low" | "medium" | "high" = "medium";
  if (emotionKey === "stressed" || emotionKey === "low") {
    density = "low";
  } else if (emotionKey === "energized") {
    density = "high";
  }

  // Determine contrast
  let contrast: "low" | "medium" | "high" = "medium";
  if (emotionKey === "stressed") {
    contrast = "low";
  } else if (emotionKey === "energized" || emotionKey === "happy") {
    contrast = "high";
  }

  return {
    colors: {
      primary: emotionColors.primary,
      secondary: emotionColors.secondary,
      gradient: emotionColors.gradient,
      background: colors.surface1,
      text: colors.text.primary,
    },
    motion: {
      speed: motionSpeed,
      transitions: {
        fast: motion.duration.fast,
        normal: motion.duration.normal,
        slow: motion.duration.slow,
        slower: motion.duration.slower,
      },
    },
    density,
    contrast,
  };
}

/**
 * Get CSS variables for emotion theme
 */
export function getEmotionThemeCSS(theme: EmotionTheme): Record<string, string> {
  return {
    "--emotion-primary": theme.colors.primary,
    "--emotion-secondary": theme.colors.secondary,
    "--emotion-gradient": theme.colors.gradient,
    "--motion-speed": theme.motion.speed,
    "--info-density": theme.density,
    "--contrast-level": theme.contrast,
  };
}

/**
 * Get animation duration based on emotion
 */
export function getEmotionDuration(
  emotion: string | null | undefined,
  baseDuration: number = 300
): number {
  const theme = getEmotionTheme(emotion);
  const speedMultiplier = {
    slow: 1.5,
    normal: 1,
    fast: 0.7,
  }[theme.motion.speed];

  return baseDuration * speedMultiplier;
}



