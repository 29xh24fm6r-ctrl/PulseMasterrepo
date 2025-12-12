// Holographic UI Mode Page
// app/experiences/holographic/page.tsx

"use client";

import { HoloCanvas } from "./HoloCanvas";
import { useUser } from "@clerk/nextjs";

export default function HolographicPage() {
  const { user } = useUser();
  const userId = user?.id || "";

  if (!userId) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="text-lg font-semibold text-text-primary mb-2">
            Please sign in to access Holographic Mode
          </div>
        </div>
      </div>
    );
  }

  return <HoloCanvas userId={userId} />;
}



