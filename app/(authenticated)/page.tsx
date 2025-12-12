// Living Universe - Master Dashboard
// app/(authenticated)/page.tsx

"use client";

import { useState, useEffect } from "react";
import { useUser } from "@clerk/nextjs";
import { UniverseLayout } from "@/components/universe/UniverseLayout";

type EmotionState = "calm" | "neutral" | "energized" | "stressed";

export default function LivingUniversePage() {
  const { user } = useUser();
  const [emotionState, setEmotionState] = useState<EmotionState>("neutral");
  const [userId, setUserId] = useState<string | undefined>();

  useEffect(() => {
    async function fetchUserData() {
      if (!user?.id) return;

      // Use Clerk ID directly - APIs will resolve to database ID if needed
      setUserId(user.id);

      try {
        // Fetch emotion
        const res = await fetch("/api/emotion");
        if (res.ok) {
          const data = await res.json();
          const detected = data.current?.detected_emotion?.toLowerCase() || "neutral";
          
          // Map to emotion state
          if (detected.includes("calm") || detected.includes("peaceful")) {
            setEmotionState("calm");
          } else if (detected.includes("energized") || detected.includes("excited")) {
            setEmotionState("energized");
          } else if (detected.includes("stressed") || detected.includes("overwhelmed")) {
            setEmotionState("stressed");
          } else {
            setEmotionState("neutral");
          }
        }
      } catch (err) {
        console.error("Failed to fetch user data:", err);
      }
    }

    fetchUserData();
  }, [user]);

  return (
    <UniverseLayout
      userName={user?.firstName || undefined}
      emotionState={emotionState}
      userId={userId}
    />
  );
}
