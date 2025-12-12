// Living Layout - Emotion-Reactive Wrapper
// app/components/layout/LivingLayout.tsx

"use client";

import { useEffect, useState } from "react";
import { useUser } from "@clerk/nextjs";
import { QuantumSidebar } from "../navigation/QuantumSidebar";
import { ButlerButton } from "../butler/ButlerButton";
import { getEmotionTheme, getEmotionThemeCSS } from "@/lib/ui/emotion-theme";

interface LivingLayoutProps {
  children: React.ReactNode;
}

export function LivingLayout({ children }: LivingLayoutProps) {
  const { user } = useUser();
  const [emotion, setEmotion] = useState<string | null>(null);
  const [energy, setEnergy] = useState<number>(0.5);
  const [activeDomain, setActiveDomain] = useState<string | undefined>();

  // Fetch emotion and energy state
  useEffect(() => {
    async function fetchState() {
      try {
        const res = await fetch("/api/cortex/context");
        if (res.ok) {
          const ctx = await res.json();
          setEmotion(ctx.emotion?.detected_emotion || null);
          setEnergy(ctx.cognitiveProfile?.currentEnergyLevel || 0.5);
          // Determine active domain from context
          const workQueue = ctx.domains?.work?.queue || [];
          const relationships = ctx.domains?.relationships?.keyPeople || [];
          if (workQueue.length > 10) setActiveDomain("work");
          else if (relationships.length > 5) setActiveDomain("relationships");
        }
      } catch (err) {
        console.error("Failed to fetch state:", err);
      }
    }

    if (user) {
      fetchState();
      const interval = setInterval(fetchState, 30000); // Update every 30s
      return () => clearInterval(interval);
    }
  }, [user]);

  // Apply emotion theme
  const theme = getEmotionTheme(emotion, 0.7);
  const themeCSS = getEmotionThemeCSS(theme);

  return (
    <div
      className="min-h-screen bg-surface1 text-text-primary"
      style={themeCSS as React.CSSProperties}
    >
      <QuantumSidebar emotion={emotion} energy={energy} activeDomain={activeDomain} />
      <main className="ml-20">{children}</main>
      <ButlerButton hasAttention={false} persona="warm_advisor" />
    </div>
  );
}



