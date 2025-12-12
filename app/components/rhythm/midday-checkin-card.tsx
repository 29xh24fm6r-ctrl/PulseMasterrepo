// Midday Check-in Card
// app/components/rhythm/midday-checkin-card.tsx

"use client";

import { useState, useEffect } from "react";
import { Clock, TrendingUp, Activity, Zap } from "lucide-react";

export function MiddayCheckinCard() {
  const [checkin, setCheckin] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadCheckin();
  }, []);

  async function loadCheckin() {
    try {
      const res = await fetch("/api/rhythm/daily?type=midday_checkin&autogenerate=true");
      const data = await res.json();
      if (res.ok && data.entries && data.entries.length > 0) {
        setCheckin(data.entries[0]);
      }
    } catch (err) {
      console.error("Failed to load check-in:", err);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-4">
        <div className="text-sm text-zinc-400">Loading check-in...</div>
      </div>
    );
  }

  if (!checkin) {
    return null;
  }

  const data = checkin.data;
  const mxpProgress = Math.min(100, (data.mxpEarned / 50) * 100); // Assuming 50 MXP is "ideal"

  return (
    <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-4 space-y-4">
      <div className="flex items-center gap-2">
        <Clock className="w-4 h-4 text-blue-400" />
        <h3 className="text-sm font-semibold text-white">Midday Check-in</h3>
      </div>

      <div className="prose prose-invert max-w-none">
        <p className="text-xs text-zinc-300 whitespace-pre-line">{checkin.summary}</p>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div className="text-center">
          <div className="text-lg font-bold text-violet-400">{data.completedSessions}</div>
          <div className="text-xs text-zinc-400">Sessions</div>
        </div>
        <div className="text-center">
          <div className="text-lg font-bold text-amber-400 flex items-center justify-center gap-1">
            <Zap className="w-4 h-4" />
            {data.mxpEarned}
          </div>
          <div className="text-xs text-zinc-400">MXP</div>
        </div>
        <div className="text-center">
          <div className="text-lg font-bold text-green-400">{data.emotionTrend.calmCount}</div>
          <div className="text-xs text-zinc-400">Calm</div>
        </div>
      </div>

      {data.nudges && data.nudges.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-xs font-semibold text-zinc-300 flex items-center gap-1">
            <Activity className="w-3 h-3" />
            Quick Nudges
          </h4>
          <div className="space-y-1">
            {data.nudges.map((nudge: string, idx: number) => (
              <div
                key={idx}
                className="text-xs text-zinc-400 bg-zinc-800/50 rounded p-2"
              >
                {nudge}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

