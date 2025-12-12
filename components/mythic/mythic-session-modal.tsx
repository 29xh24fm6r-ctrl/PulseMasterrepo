"use client";

import { useMemo, useState } from "react";
import useSWRMutation from "swr/mutation";
import { X } from "lucide-react";

async function postSession(url: string, { arg }: { arg: any }) {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(arg),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json?.error || "Failed to save session");
  return json;
}

export function MythicSessionModal({
  open,
  onOpenChange,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onSaved?: () => void;
}) {
  const [sessionType, setSessionType] = useState("arc_deepen");
  const [transcript, setTranscript] = useState("");
  const [summary, setSummary] = useState("");

  const { trigger, isMutating, error } = useSWRMutation("/api/mythic/session", postSession);

  const canSave = useMemo(() => transcript.trim().length > 0, [transcript]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={() => onOpenChange(false)}
      />
      <div className="relative max-w-2xl w-full mx-4 rounded-2xl border border-zinc-800 bg-zinc-950/95 backdrop-blur-xl text-white shadow-2xl">
        <div className="p-6">
            <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-2xl font-bold bg-gradient-to-r from-purple-300 to-fuchsia-300 bg-clip-text text-transparent">
                Mythic Story Session
              </h2>
              <div className="text-sm text-zinc-400 mt-1">
                Record your chapter. Pulse will extract quests, shadows, and act progression.
              </div>
            </div>
            <button
              onClick={() => onOpenChange(false)}
              className="p-2 hover:bg-zinc-800 rounded-lg transition-colors text-zinc-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="rounded-xl bg-zinc-900/50 border border-zinc-800 p-4 space-y-4">
            <div className="flex gap-2 items-center justify-between">
              <label className="text-xs text-zinc-400 uppercase tracking-wider">
                Session Type
              </label>
              <select
                className="bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-sm text-white"
                value={sessionType}
                onChange={(e) => setSessionType(e.target.value)}
              >
                <option value="arc_create">arc_create</option>
                <option value="arc_deepen">arc_deepen</option>
                <option value="shadow">shadow</option>
                <option value="transformation">transformation</option>
                <option value="chapter_review">chapter_review</option>
              </select>
            </div>

            <div>
              <label className="text-xs text-zinc-400 uppercase tracking-wider">
                Transcript
              </label>
              <textarea
                className="mt-1 w-full min-h-[160px] rounded-xl bg-zinc-900 border border-zinc-800 p-3 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-violet-500"
                placeholder="Speak or type what happened in your chapter today…"
                value={transcript}
                onChange={(e) => setTranscript(e.target.value)}
              />
            </div>

            <div>
              <label className="text-xs text-zinc-400 uppercase tracking-wider">
                Summary (optional)
              </label>
              <textarea
                className="mt-1 w-full min-h-[90px] rounded-xl bg-zinc-900 border border-zinc-800 p-3 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-violet-500"
                placeholder="One paragraph summary (optional)"
                value={summary}
                onChange={(e) => setSummary(e.target.value)}
              />
            </div>

            {error && (
              <div className="mt-3 p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-sm text-red-300">
                {String(error.message || error)}
              </div>
            )}

            <div className="mt-4 flex justify-end gap-2">
              <button
                className="px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white text-sm font-medium transition-colors disabled:opacity-50"
                onClick={() => onOpenChange(false)}
                disabled={isMutating}
              >
                Cancel
              </button>
              <button
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-fuchsia-500 to-purple-600 hover:opacity-90 text-white text-sm font-semibold transition-all shadow-lg shadow-purple-500/20 hover:shadow-purple-500/30 disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={!canSave || isMutating}
                onClick={async () => {
                  try {
                    await trigger({
                      sessionType,
                      transcript,
                      summary: summary || null,
                    });
                    setTranscript("");
                    setSummary("");
                    onOpenChange(false);
                    onSaved?.();
                  } catch (err) {
                    // Error already shown in error state
                    console.error("[Mythic Session] Save failed:", err);
                  }
                }}
              >
                {isMutating ? "Extracting & Saving…" : "Canonize Session"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

