"use client";

import { ReactNode, useEffect } from "react";
import { AutonomyProvider } from "@/lib/use-autonomy";
import { XPToastWrapper } from "./components/xp-toast-wrapper";
import { devBootstrapPulseOwnerUserId } from "@/lib/auth/devBootstrap";

/**
 * Providers component - wraps the app with all context providers
 * Add new providers here to make them available app-wide
 */
export function Providers({ children }: { children: ReactNode }) {
  // Task F.1: Bootstrap dev auth token on mount
  useEffect(() => {
    devBootstrapPulseOwnerUserId();
  }, []);

  return (
    <AutonomyProvider>
      <XPToastWrapper>
        {children}
      </XPToastWrapper>
    </AutonomyProvider>
  );
}
