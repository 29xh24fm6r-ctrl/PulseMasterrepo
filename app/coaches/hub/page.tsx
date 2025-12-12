// Coach Hub - Shared Insights
// app/coaches/hub/page.tsx

"use client";

import { useState, useEffect } from "react";
import { Lightbulb, Filter } from "lucide-react";

interface Insight {
  id: string;
  title: string;
  body: string;
  coach_id: string | null;
  tags: string[];
  importance: number;
  created_at: string;
}

const COACH_LABELS: Record<string, string> = {
  sales: "Sales Coach",
  confidant: "Confidant Coach",
  executive: "Executive Coach",
  warrior: "Warrior Coach",
  negotiation: "Negotiation Coach",
  emotional: "Emotional Coach",
  strategy: "Strategy Coach",
};

export default function CoachHubPage() {
  const [insights, setInsights] = useState<Insight[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCoach, setSelectedCoach] = useState<string | null>(null);
  const [selectedTag, setSelectedTag] = useState<string | null>(null);

  useEffect(() => {
    loadInsights();
  }, []);

  async function loadInsights() {
    try {
      const res = await fetch("/api/coach-hub/insights");
      const data = await res.json();
      if (res.ok) {
        setInsights(data.insights || []);
      }
    } catch (err) {
      console.error("Failed to load insights:", err);
    } finally {
      setLoading(false);
    }
  }

  const filteredInsights = insights.filter((insight) => {
    if (selectedCoach && insight.coach_id !== selectedCoach) return false;
    if (selectedTag && !insight.tags.includes(selectedTag)) return false;
    return true;
  });

  const allTags = Array.from(new Set(insights.flatMap((i) => i.tags)));
  const allCoaches = Array.from(new Set(insights.map((i) => i.coach_id).filter(Boolean)));

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-950 text-zinc-100 flex items-center justify-center">
        <div className="text-zinc-400">Loading insights...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-white mb-2">Coach Intelligence Hub</h1>
          <p className="text-sm text-zinc-400">
            Global insights about you from all coaches
          </p>
        </div>

        {/* Filters */}
        <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-4 space-y-3">
          <div className="flex items-center gap-2 text-sm text-zinc-400">
            <Filter className="w-4 h-4" />
            <span>Filters</span>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setSelectedCoach(null)}
              className={`px-3 py-1 rounded text-xs transition-colors ${
                selectedCoach === null
                  ? "bg-violet-600 text-white"
                  : "bg-zinc-800 text-zinc-300 hover:bg-zinc-700"
              }`}
            >
              All Coaches
            </button>
            {allCoaches.map((coachId) => (
              <button
                key={coachId}
                onClick={() => setSelectedCoach(coachId)}
                className={`px-3 py-1 rounded text-xs transition-colors ${
                  selectedCoach === coachId
                    ? "bg-violet-600 text-white"
                    : "bg-zinc-800 text-zinc-300 hover:bg-zinc-700"
                }`}
              >
                {COACH_LABELS[coachId || ""] || coachId}
              </button>
            ))}
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setSelectedTag(null)}
              className={`px-3 py-1 rounded text-xs transition-colors ${
                selectedTag === null
                  ? "bg-violet-600 text-white"
                  : "bg-zinc-800 text-zinc-300 hover:bg-zinc-700"
              }`}
            >
              All Tags
            </button>
            {allTags.map((tag) => (
              <button
                key={tag}
                onClick={() => setSelectedTag(tag)}
                className={`px-3 py-1 rounded text-xs transition-colors ${
                  selectedTag === tag
                    ? "bg-violet-600 text-white"
                    : "bg-zinc-800 text-zinc-300 hover:bg-zinc-700"
                }`}
              >
                {tag}
              </button>
            ))}
          </div>
        </div>

        {/* Insights List */}
        <div className="space-y-4">
          {filteredInsights.length === 0 ? (
            <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-8 text-center text-zinc-400">
              No insights found. Keep using coaches to build insights.
            </div>
          ) : (
            filteredInsights.map((insight) => (
              <div
                key={insight.id}
                className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-4 space-y-2"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <Lightbulb className="w-4 h-4 text-amber-400 flex-shrink-0" />
                    <h3 className="text-sm font-semibold text-white">{insight.title}</h3>
                  </div>
                  {insight.coach_id && (
                    <span className="px-2 py-0.5 bg-violet-500/20 text-violet-400 rounded text-xs">
                      {COACH_LABELS[insight.coach_id] || insight.coach_id}
                    </span>
                  )}
                </div>
                <p className="text-sm text-zinc-300">{insight.body}</p>
                <div className="flex flex-wrap gap-1">
                  {insight.tags.map((tag) => (
                    <span
                      key={tag}
                      className="px-2 py-0.5 bg-zinc-800 text-zinc-400 rounded text-xs"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
                <div className="text-xs text-zinc-500">
                  {new Date(insight.created_at).toLocaleDateString()}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

