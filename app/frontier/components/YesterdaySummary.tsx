"use client";

import { FileText, Sparkles } from "lucide-react";

interface Props {
  summary: {
    summary: string;
    key_events: string[];
    emotional_theme: string;
    identity_signal: string;
    productivity_score: number;
    tomorrow_focus: string;
  } | null;
}

export function YesterdaySummary({ summary }: Props) {
  if (!summary) {
    return (
      <div className="bg-zinc-800/50 rounded-2xl p-6 border border-zinc-700/50">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-amber-500/20 rounded-lg">
            <FileText className="w-5 h-5 text-amber-400" />
          </div>
          <h3 className="font-semibold text-lg">Yesterday's Summary</h3>
        </div>
        <p className="text-zinc-500">No summary available for yesterday yet.</p>
      </div>
    );
  }

  return (
    <div className="bg-zinc-800/50 rounded-2xl p-6 border border-zinc-700/50">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-amber-500/20 rounded-lg">
            <FileText className="w-5 h-5 text-amber-400" />
          </div>
          <h3 className="font-semibold text-lg">Yesterday's Summary</h3>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-zinc-500">Productivity</span>
          <span className="px-2 py-1 bg-amber-500/20 text-amber-400 rounded-full text-sm font-bold">
            {summary.productivity_score}/10
          </span>
        </div>
      </div>

      <p className="text-zinc-300 mb-4">{summary.summary}</p>

      <div className="grid grid-cols-2 gap-4 mb-4">
        <div className="bg-zinc-900/50 rounded-lg p-3">
          <p className="text-xs text-zinc-500 mb-1">Emotional Theme</p>
          <p className="text-sm text-zinc-300">{summary.emotional_theme}</p>
        </div>
        <div className="bg-zinc-900/50 rounded-lg p-3">
          <p className="text-xs text-zinc-500 mb-1">Identity Signal</p>
          <p className="text-sm text-zinc-300">{summary.identity_signal}</p>
        </div>
      </div>

      {summary.key_events?.length > 0 && (
        <div className="mb-4">
          <p className="text-xs text-zinc-500 mb-2">Key Events</p>
          <ul className="space-y-1">
            {summary.key_events.map((event, i) => (
              <li key={i} className="text-sm text-zinc-400 flex items-start gap-2">
                <span className="text-amber-400">•</span>
                {event}
              </li>
            ))}
          </ul>
        </div>
      )}

      {summary.tomorrow_focus && (
        <div className="bg-gradient-to-r from-violet-500/10 to-pink-500/10 rounded-lg p-3 border border-violet-500/20">
          <div className="flex items-center gap-2 mb-1">
            <Sparkles className="w-4 h-4 text-violet-400" />
            <p className="text-xs text-violet-400 uppercase tracking-wide">Today's Focus</p>
          </div>
          <p className="text-sm text-zinc-300">{summary.tomorrow_focus}</p>
        </div>
      )}
    </div>
  );
}