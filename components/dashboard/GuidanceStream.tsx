"use client";

import { useState, useEffect } from "react";
import { GuidanceCard, EmotionalState } from "@/types/dashboard";
import { logDashboardEvent } from "@/lib/dashboard/telemetryClient";
import { X, ArrowRight, Sparkles } from "lucide-react";

export function GuidanceStream({ userId }: { userId: string }) {
  const [cards, setCards] = useState<GuidanceCard[]>([]);
  const [emotionalState, setEmotionalState] = useState<EmotionalState>("CALM");
  const [loading, setLoading] = useState(true);
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetch("/api/dashboard/guidance")
      .then((r) => r.json())
      .then((data) => {
        setCards(data.cards || []);
        setEmotionalState(data.emotionalState || "CALM");
      })
      .finally(() => setLoading(false));
  }, []);

  const handleDismiss = (cardId: string) => {
    setDismissed((prev) => new Set(prev).add(cardId));
    logDashboardEvent({ widgetKey: "guidance_stream", eventType: "DISMISS", metadata: { cardId } });
  };

  const handleCta = (card: GuidanceCard) => {
    logDashboardEvent({ widgetKey: "guidance_stream", eventType: "CLICK", metadata: { cardId: card.id } });
    if (card.ctaAction === "FOCUS_MODE_TOGGLE") {
      window.dispatchEvent(new CustomEvent("toggleFocusMode"));
    } else if (card.ctaAction) {
      window.location.href = card.ctaAction;
    }
  };

  const stateEmoji: Record<EmotionalState, string> = {
    CALM: "😌", FOCUSED: "🎯", OVERWHELMED: "😰", LOW: "😔", HYPED: "🔥",
  };

  if (loading) {
    return <div className="animate-pulse space-y-3"><div className="h-24 bg-zinc-800 rounded-xl" /><div className="h-24 bg-zinc-800 rounded-xl" /></div>;
  }

  const visible = cards.filter((c) => !dismissed.has(c.id));

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-zinc-100 flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-violet-400" /> Guidance
        </h2>
        <span className="text-sm text-zinc-400">{stateEmoji[emotionalState]} {emotionalState.toLowerCase()}</span>
      </div>

      <div className="flex-1 overflow-y-auto space-y-3">
        {visible.length === 0 ? (
          <p className="text-zinc-500 text-center py-8">You're all caught up! ✨</p>
        ) : (
          visible.sort((a, b) => a.priority - b.priority).map((card) => (
            <div key={card.id} className="relative bg-zinc-800/50 rounded-xl p-4 border-l-4 border-l-violet-500">
              {card.dismissible && (
                <button onClick={() => handleDismiss(card.id)} className="absolute top-2 right-2 p-1 text-zinc-500 hover:text-zinc-300">
                  <X className="w-4 h-4" />
                </button>
              )}
              <h3 className="text-sm font-medium text-zinc-100 mb-1 pr-6">{card.title}</h3>
              <p className="text-sm text-zinc-400 whitespace-pre-line">{card.body}</p>
              {card.ctaLabel && (
                <button onClick={() => handleCta(card)} className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-violet-400 hover:text-violet-300">
                  {card.ctaLabel} <ArrowRight className="w-4 h-4" />
                </button>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
