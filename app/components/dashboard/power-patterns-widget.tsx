// Power Patterns Widget
// app/components/dashboard/power-patterns-widget.tsx

"use client";

import { useState, useEffect } from "react";
import { TrendingUp, AlertCircle, Lightbulb } from "lucide-react";

interface Pattern {
  pattern_type: string;
  key: string;
  emotion_dominant: string | null;
  confidence: number;
  sample_size: number;
}

export function PowerPatternsWidget() {
  const [patterns, setPatterns] = useState<Pattern[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadPatterns();
  }, []);

  async function loadPatterns() {
    try {
      const res = await fetch("/api/patterns/summary");
      const data = await res.json();
      if (res.ok) {
        setPatterns(data.patterns || []);
      }
    } catch (err) {
      console.error("Failed to load patterns:", err);
    } finally {
      setLoading(false);
    }
  }

  function formatPatternKey(pattern: Pattern): string {
    if (pattern.pattern_type === "time_of_day") {
      return pattern.key.replace("_", " ").replace(/\b\w/g, (l) => l.toUpperCase());
    }
    if (pattern.pattern_type === "weekday") {
      return pattern.key.replace(/\b\w/g, (l) => l.toUpperCase());
    }
    if (pattern.pattern_type === "coach") {
      return `${pattern.key.replace("_", " ").replace(/\b\w/g, (l) => l.toUpperCase())} sessions`;
    }
    return pattern.key;
  }

  function getSuggestion(pattern: Pattern): string {
    const emotion = pattern.emotion_dominant?.toLowerCase();
    const key = pattern.key.toLowerCase();

    if (emotion === "stress" || emotion === "anxious") {
      if (pattern.pattern_type === "time_of_day" && key.includes("morning")) {
        return "Pre-block a 10 min reset before your first meeting.";
      }
      if (pattern.pattern_type === "weekday" && key === "monday") {
        return "Start Monday with a grounding exercise or Confidant Coach session.";
      }
      return "Consider scheduling a wind-down period or Confidant Coach support.";
    }

    if (emotion === "calm" || emotion === "stabilize") {
      if (pattern.pattern_type === "coach") {
        return "Great place to go when you feel overloaded.";
      }
      return "This is a positive pattern — leverage it for important work.";
    }

    if (emotion === "hype" || emotion === "energized") {
      return "Channel this energy into high-impact tasks.";
    }

    return "Be mindful of this pattern and plan accordingly.";
  }

  if (loading) {
    return (
      <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-4">
        <div className="text-sm text-zinc-400">Loading patterns...</div>
      </div>
    );
  }

  if (patterns.length === 0) {
    return (
      <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-4">
        <div className="flex items-center gap-2 mb-2">
          <TrendingUp className="w-4 h-4 text-violet-400" />
          <h3 className="text-sm font-semibold text-white">Power Patterns</h3>
        </div>
        <div className="text-xs text-zinc-400">
          No patterns detected yet. Keep using Pulse to build insights.
        </div>
      </div>
    );
  }

  const topPatterns = patterns.slice(0, 3);

  return (
    <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-4 space-y-3">
      <div className="flex items-center gap-2">
        <TrendingUp className="w-4 h-4 text-violet-400" />
        <h3 className="text-sm font-semibold text-white">Power Patterns</h3>
      </div>

      <div className="space-y-3">
        {topPatterns.map((pattern, idx) => (
          <div key={idx} className="border-l-2 border-violet-500/50 pl-3 space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-white">
                {formatPatternKey(pattern)}
              </span>
              <span className="text-xs text-zinc-400">
                {(pattern.confidence * 100).toFixed(0)}% conf
              </span>
            </div>
            <div className="flex items-center gap-2">
              {pattern.emotion_dominant && (
                <span className="px-1.5 py-0.5 bg-blue-500/20 text-blue-400 rounded text-xs capitalize">
                  {pattern.emotion_dominant}
                </span>
              )}
              <span className="text-xs text-zinc-500">
                ({pattern.sample_size} samples)
              </span>
            </div>
            <div className="flex items-start gap-1.5 text-xs text-zinc-400">
              <Lightbulb className="w-3 h-3 mt-0.5 text-amber-400 flex-shrink-0" />
              <span>{getSuggestion(pattern)}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

