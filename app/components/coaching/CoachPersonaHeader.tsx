// Coach Persona Header
// app/components/coaching/CoachPersonaHeader.tsx

"use client";

import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useCoachPanelStore } from "./useCoachPanelStore";
import { getCoachDef } from "@/lib/coaching/catalog";
import * as LucideIcons from "lucide-react";

interface CoachPersonaHeaderProps {
  coachKey: string;
}

export function CoachPersonaHeader({ coachKey }: CoachPersonaHeaderProps) {
  const { closeCoach } = useCoachPanelStore();
  const coach = getCoachDef(coachKey as any);

  const IconComponent = (LucideIcons as any)[coach.icon] || LucideIcons.MessageSquare;

  return (
    <div className="flex items-center justify-between p-4 border-b border-zinc-800 bg-zinc-900/50">
      <div className="flex items-center gap-3">
        <div className={`p-2 rounded-lg bg-${coach.primaryColor}-600/20 border border-${coach.primaryColor}-600/30`}>
          <IconComponent className={`w-5 h-5 text-${coach.primaryColor}-400`} />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-semibold text-white">{coach.name}</h2>
            <Badge variant="outline" className="bg-zinc-800 text-zinc-300 text-xs">
              {coach.shortLabel}
            </Badge>
          </div>
          <p className="text-xs text-zinc-400">{coach.tagline}</p>
        </div>
      </div>
      <Button
        size="sm"
        variant="ghost"
        onClick={closeCoach}
        className="h-8 w-8 p-0"
      >
        <X className="w-4 h-4" />
      </Button>
    </div>
  );
}




