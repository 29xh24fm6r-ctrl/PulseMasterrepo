// Global Help Button Component
// app/components/onboarding/HelpButton.tsx

"use client";

import { HelpCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useCoachPanelStore } from "@/app/components/coaching/useCoachPanelStore";

interface HelpButtonProps {
  origin?: string;
  initialMessage?: string;
  variant?: "button" | "icon";
}

export function HelpButton({
  origin = "global.help",
  initialMessage,
  variant = "icon",
}: HelpButtonProps) {
  const { openCoach } = useCoachPanelStore();

  function handleClick() {
    openCoach({
      coachKey: "pulse_guide",
      origin,
      initialUserMessage: initialMessage,
    });
  }

  if (variant === "icon") {
    return (
      <Button
        variant="ghost"
        size="sm"
        onClick={handleClick}
        className="h-8 w-8 p-0"
        title="Ask Pulse how to use this"
      >
        <HelpCircle className="w-4 h-4" />
      </Button>
    );
  }

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={handleClick}
      className="text-zinc-400 hover:text-zinc-300"
    >
      What is this page?
    </Button>
  );
}

