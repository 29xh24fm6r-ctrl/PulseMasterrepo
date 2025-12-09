"use client";
import { XPToastProvider, useXPToast, setGlobalToastFunction } from "./xp-toast";
import { useAutonomy } from "@/lib/use-autonomy";
import { useEffect } from "react";

// Inner component that registers the global toast function with autonomy awareness
function XPToastRegistrar({ children }: { children: React.ReactNode }) {
  const { showXPToast } = useXPToast();
  const { settings, isInQuietHours } = useAutonomy();

  useEffect(() => {
    // Wrap the toast function to respect autonomy
    const autonomyAwareToast = (toast: Parameters<typeof showXPToast>[0]) => {
      // Suppress toasts in Zen mode or quiet hours
      if (settings.globalLevel === "zen") {
        console.log("[XP Toast] Suppressed - Zen mode");
        return;
      }
      if (isInQuietHours()) {
        console.log("[XP Toast] Suppressed - Quiet hours");
        return;
      }
      showXPToast(toast);
    };

    setGlobalToastFunction(autonomyAwareToast);
    return () => setGlobalToastFunction(null);
  }, [showXPToast, settings.globalLevel, isInQuietHours]);

  return <>{children}</>;
}

// Wrapper that provides context and registers global function
export function XPToastWrapper({ children }: { children: React.ReactNode }) {
  return (
    <XPToastProvider>
      <XPToastRegistrar>{children}</XPToastRegistrar>
    </XPToastProvider>
  );
}
