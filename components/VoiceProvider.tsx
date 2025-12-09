"use client";

import { GlobalVoiceButton } from "./GlobalVoiceButton";

interface VoiceProviderProps {
  children: React.ReactNode;
  enableGlobalButton?: boolean;
  position?: "bottom-right" | "bottom-left" | "bottom-center";
}

export function VoiceProvider({ 
  children, 
  enableGlobalButton = true,
  position = "bottom-right"
}: VoiceProviderProps) {
  return (
    <>
      {children}
      {enableGlobalButton && <GlobalVoiceButton position={position} />}
    </>
  );
}
