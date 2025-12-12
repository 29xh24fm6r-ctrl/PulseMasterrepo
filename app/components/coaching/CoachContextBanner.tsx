// Coach Context Banner
// app/components/coaching/CoachContextBanner.tsx

"use client";

import { useState } from "react";
import { X, Info } from "lucide-react";
import { Button } from "@/components/ui/button";

interface CoachContextBannerProps {
  coachKey: string;
  origin?: string;
  contextSummary?: string;
}

export function CoachContextBanner({ coachKey, origin, contextSummary }: CoachContextBannerProps) {
  const [dismissed, setDismissed] = useState(false);

  if (dismissed || !contextSummary) return null;

  const messages: Record<string, string> = {
    financial: "I'm using your current month cashflow, budgets, and goals to guide suggestions.",
    strategy: "I'm looking at your 90-day strategy, pillars, and Life Arcs.",
    confidant: "I'm here to help you process how you feel. This isn't therapy or a medical service — just a reflective space.",
    sales: "I'm using your pipeline, deals, and relationship radar to guide suggestions.",
    career: "I'm looking at your career level, progress, and job profile.",
    productivity: "I'm using your today's focus and autopilot queue to guide suggestions.",
  };

  const message = messages[coachKey] || contextSummary;

  return (
    <div className="px-4 py-2 bg-zinc-800/50 border-b border-zinc-800 flex items-center gap-2 text-sm">
      <Info className="w-4 h-4 text-zinc-400 flex-shrink-0" />
      <p className="text-zinc-400 flex-1">{message}</p>
      <Button
        size="sm"
        variant="ghost"
        onClick={() => setDismissed(true)}
        className="h-6 w-6 p-0 flex-shrink-0"
      >
        <X className="w-3 h-3" />
      </Button>
    </div>
  );
}




