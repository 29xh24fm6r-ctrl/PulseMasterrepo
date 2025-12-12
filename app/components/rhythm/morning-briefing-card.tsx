// Morning Briefing Card
// app/components/rhythm/morning-briefing-card.tsx

"use client";

import { useState, useEffect } from "react";
import { Sunrise, AlertTriangle, Calendar, Target, ArrowRight } from "lucide-react";
import Link from "next/link";

const COACH_LABELS: Record<string, string> = {
  sales: "Sales Coach",
  confidant: "Confidant Coach",
  executive: "Executive Coach",
  warrior: "Warrior Coach",
  negotiation: "Negotiation Coach",
  emotional: "Emotional Coach",
  strategy: "Strategy Coach",
};

export function MorningBriefingCard() {
  const [briefing, setBriefing] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadBriefing();
  }, []);

  async function loadBriefing() {
    try {
      const res = await fetch(
        "/api/rhythm/daily?type=morning_briefing&autogenerate=true"
      );
      const data = await res.json();
      if (res.ok && data.entries && data.entries.length > 0) {
        setBriefing(data.entries[0]);
      }
    } catch (err) {
      console.error("Failed to load briefing:", err);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-4">
        <div className="text-sm text-zinc-400">Loading morning briefing...</div>
      </div>
    );
  }

  if (!briefing) {
    return null;
  }

  const data = briefing.data;

  return (
    <div className="bg-gradient-to-br from-violet-900/20 to-zinc-900/50 border border-violet-800/50 rounded-xl p-6 space-y-4">
      <div className="flex items-center gap-2">
        <Sunrise className="w-5 h-5 text-violet-400" />
        <h2 className="text-lg font-semibold text-white">Morning Briefing</h2>
      </div>

      <div className="prose prose-invert max-w-none">
        <p className="text-sm text-zinc-300 whitespace-pre-line">{briefing.summary}</p>
      </div>

      {data.topRisks && data.topRisks.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-semibold text-zinc-300 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-400" />
            Today&apos;s Risks
          </h3>
          <div className="space-y-1">
            {data.topRisks.slice(0, 3).map((risk: any, idx: number) => (
              <div
                key={idx}
                className="text-xs text-zinc-400 bg-zinc-800/50 rounded p-2"
              >
                <span className="font-medium text-amber-400">{risk.time}</span> —{" "}
                {risk.risk_type.replace("_", " ")} ({(risk.risk_score * 100).toFixed(0)}% risk)
              </div>
            ))}
          </div>
        </div>
      )}

      {data.keyEvents && data.keyEvents.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-semibold text-zinc-300 flex items-center gap-2">
            <Calendar className="w-4 h-4 text-blue-400" />
            Key Events
          </h3>
          <div className="space-y-1">
            {data.keyEvents.slice(0, 5).map((event: any, idx: number) => (
              <div
                key={idx}
                className="text-xs text-zinc-400 flex items-center gap-2"
              >
                <span className="font-medium text-blue-400">{event.time}</span>
                <span>{event.title}</span>
                {event.risk_flag && (
                  <span className="px-1.5 py-0.5 bg-amber-500/20 text-amber-400 rounded text-xs">
                    Risk
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {data.identityFocus && (
        <div className="bg-violet-500/10 border border-violet-500/30 rounded-lg p-3">
          <h3 className="text-sm font-semibold text-violet-400 mb-1 flex items-center gap-2">
            <Target className="w-4 h-4" />
            Identity Focus
          </h3>
          <p className="text-xs text-zinc-300">{data.identityFocus.message}</p>
        </div>
      )}

      {data.suggestedCoaches && data.suggestedCoaches.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-semibold text-zinc-300">Suggested Coaches</h3>
          <div className="flex flex-wrap gap-2">
            {data.suggestedCoaches.map((coach: any, idx: number) => (
              <Link
                key={idx}
                href={`/coaches/${coach.coachId}`}
                className="flex items-center gap-1 bg-violet-600 hover:bg-violet-700 text-white px-3 py-1.5 rounded text-xs transition-colors"
              >
                {COACH_LABELS[coach.coachId] || coach.coachId}
                <ArrowRight className="w-3 h-3" />
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

