"use client";

import useSWR from "swr";
import { RefreshCw, Sparkles } from "lucide-react";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export function MythicArcCard({ onContinue }: { onContinue: () => void }) {
  const { data, isLoading, mutate } = useSWR("/api/mythic/state", fetcher, {
    refreshInterval: 30000, // Refresh every 30s
  });

  const arc = data?.activeArc;

  return (
    <div className="p-6 bg-gradient-to-br from-zinc-900/80 via-purple-900/20 to-zinc-900/80 border border-purple-500/20 rounded-2xl shadow-xl backdrop-blur-sm">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 mb-2">
            <Sparkles className="w-4 h-4 text-purple-400" />
            <div className="text-xs uppercase tracking-wider text-purple-300 font-medium">
              Current Arc
            </div>
          </div>

          <div className="text-2xl font-bold text-white truncate mb-1 bg-gradient-to-r from-white to-purple-200 bg-clip-text text-transparent">
            {isLoading ? "Loading…" : arc?.title ?? "The Current Chapter"}
          </div>

          {arc && data?.actLabel && (
            <div className="mt-2 text-sm font-medium text-purple-300">
              {data.actLabel}
            </div>
          )}

          {!arc && (
            <div className="mt-2 text-sm text-zinc-400">
              Start a mythic session to begin your chapter.
            </div>
          )}

          {arc && (
            <div className="mt-4 space-y-2 text-sm">
              {data?.dominantTrial && (
                <div className="flex items-start gap-2">
                  <span className="text-zinc-500 font-medium min-w-[60px]">Trial:</span>
                  <span className="text-zinc-300">{data.dominantTrial}</span>
                </div>
              )}
              {data?.shadowLine && data.shadowLine !== "Shadow: unnamed resistance" && (
                <div className="flex items-start gap-2">
                  <span className="text-zinc-500 font-medium min-w-[60px]">Shadow:</span>
                  <span className="text-amber-300">
                    {(data.shadowLine ?? "").replace("Shadow: ", "") || "—"}
                  </span>
                </div>
              )}
              {data?.activeQuestCount !== undefined && data.activeQuestCount > 0 && (
                <div className="flex items-center gap-2">
                  <span className="text-zinc-500 font-medium min-w-[60px]">Quests:</span>
                  <span className="text-emerald-400 font-semibold">
                    {data.activeQuestCount} active
                  </span>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="flex flex-col gap-2 shrink-0">
          <button
            onClick={onContinue}
            className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-fuchsia-500 to-purple-600 hover:opacity-90 text-white text-sm font-semibold transition-all shadow-lg shadow-purple-500/20 hover:shadow-purple-500/30"
          >
            Continue
          </button>

          <button
            onClick={() => mutate()}
            className="px-4 py-2 rounded-xl bg-zinc-800/50 hover:bg-zinc-800 text-zinc-300 text-xs font-medium transition-colors flex items-center justify-center gap-2 border border-zinc-700/50"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Refresh
          </button>
        </div>
      </div>
    </div>
  );
}

