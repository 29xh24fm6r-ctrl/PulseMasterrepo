// AR Mode Page
// app/experiences/ar/page.tsx

"use client";

import { useState, useEffect } from "react";
import { ARScene } from "./ARScene";
import { buildARContext } from "@/lib/ar/context-builder";
import { ARContext } from "@/lib/ar/context-builder";
import { LoadingState } from "@/components/ui/LoadingState";

export default function ARModePage() {
  const [context, setContext] = useState<ARContext | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadARContext();
  }, []);

  async function loadARContext() {
    setLoading(true);
    try {
      // Get userId from auth
      const userId = "user_123"; // Would get from auth
      const arContext = await buildARContext(userId);
      setContext(arContext);
    } catch (err) {
      console.error("Failed to load AR context:", err);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return <LoadingState message="Initializing AR experience..." />;
  }

  if (!context) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="text-lg font-semibold text-text-primary mb-2">
            Failed to load AR context
          </div>
        </div>
      </div>
    );
  }

  return (
    <ARScene
      context={context}
      onCardExpand={(cardId) => {
        console.log("Expanded card:", cardId);
      }}
      onDomainSwitch={(domain) => {
        console.log("Switched domain:", domain);
      }}
    />
  );
}



