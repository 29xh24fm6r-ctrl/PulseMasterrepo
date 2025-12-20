// Adaptive Interface Component - Experience Ω
// app/components/zero-friction/AdaptiveInterface.tsx

"use client";

import { useEffect, useState } from "react";
import type { AdaptiveInterfaceConfig } from "@/lib/zero-friction/types";
import { useEmotion } from "@/lib/emotion-os/hooks/useEmotion";

interface AdaptiveInterfaceProps {
  children: React.ReactNode;
}

export function AdaptiveInterface({ children }: AdaptiveInterfaceProps) {
  const [config, setConfig] = useState<AdaptiveInterfaceConfig | null>(null);
  const { emotionState } = useEmotion();

  useEffect(() => {
    loadConfig();
  }, [emotionState]);

  async function loadConfig() {
    try {
      const res = await fetch("/api/zero-friction/adaptive-interface");
      if (res.ok) {
        const data = await res.json();
        setConfig(data.config);
      }
    } catch (err) {
      console.error("Failed to load adaptive interface config:", err);
    }
  }

  // Apply config to document
  useEffect(() => {
    if (!config) return;

    const root = document.documentElement;

    // Apply information density
    if (config.informationDensity === "low") {
      root.style.setProperty("--ui-density", "0.5");
    } else if (config.informationDensity === "high") {
      root.style.setProperty("--ui-density", "1.5");
    } else {
      root.style.setProperty("--ui-density", "1");
    }

    // Apply animation speed
    if (config.slowAnimations) {
      root.style.setProperty("--motion-speed", "0.5");
    } else {
      root.style.setProperty("--motion-speed", "1");
    }

    // Apply color softness
    if (config.softenColors) {
      root.style.setProperty("--ui-contrast", "0.7");
    } else {
      root.style.setProperty("--ui-contrast", "1");
    }
  }, [config]);

  // Conditionally render children based on config
  if (!config) {
    return <>{children}</>;
  }

  // Hide complex features if needed
  if (!config.showComplexFeatures) {
    // Would filter out complex components
  }

  return <>{children}</>;
}



