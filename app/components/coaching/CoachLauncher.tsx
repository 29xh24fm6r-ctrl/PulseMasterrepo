// Coach Launcher
// app/components/coaching/CoachLauncher.tsx

"use client";

import { Button } from "@/components/ui/button";
import { useCoachPanelStore } from "./useCoachPanelStore";
import { getCoachDef, CoachKey } from "@/lib/coaching/catalog";
import { MessageSquare } from "lucide-react";
import * as LucideIcons from "lucide-react";

interface CoachLauncherProps {
  coachKey: CoachKey;
  origin?: string;
  label?: string;
  variant?: "button" | "link" | "icon";
  size?: "sm" | "md" | "lg";
  initialUserMessage?: string;
  className?: string;
}

export function CoachLauncher({
  coachKey,
  origin,
  label,
  variant = "button",
  size = "md",
  initialUserMessage,
  className,
}: CoachLauncherProps) {
  const { openCoach } = useCoachPanelStore();
  const coach = getCoachDef(coachKey);

  // Get icon component
  const IconComponent = (LucideIcons as any)[coach.icon] || MessageSquare;

  const handleClick = () => {
    openCoach({
      coachKey,
      origin,
      initialUserMessage,
    });
  };

  if (variant === "icon") {
    return (
      <button
        onClick={handleClick}
        className={`p-2 rounded-lg hover:bg-zinc-800 transition-colors ${className || ""}`}
        title={`Talk to ${coach.name}`}
      >
        <IconComponent className="w-5 h-5 text-zinc-400 hover:text-white" />
      </button>
    );
  }

  if (variant === "link") {
    return (
      <button
        onClick={handleClick}
        className={`text-sm text-violet-400 hover:text-violet-300 underline ${className || ""}`}
      >
        {label || `Talk to ${coach.shortLabel}`}
      </button>
    );
  }

  return (
    <Button
      onClick={handleClick}
      size={size}
      variant="outline"
      className={className}
    >
      <IconComponent className="w-4 h-4 mr-2" />
      {label || `Talk to ${coach.shortLabel}`}
    </Button>
  );
}




