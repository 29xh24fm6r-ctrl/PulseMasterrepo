"use client";

import { ReactNode } from "react";
import { AutonomyProvider } from "@/lib/use-autonomy";
import { XPToastWrapper } from "./components/xp-toast-wrapper";

/**
 * Providers component - wraps the app with all context providers
 * Add new providers here to make them available app-wide
 */
export function Providers({ children }: { children: ReactNode }) {
  return (
    <AutonomyProvider>
      <XPToastWrapper>
        {children}
      </XPToastWrapper>
    </AutonomyProvider>
  );
}
