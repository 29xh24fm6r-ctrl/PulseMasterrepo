// Evening Debrief Page
// app/rhythm/evening/page.tsx

"use client";

import { useState, useEffect } from "react";
import { Moon, CheckCircle2, AlertCircle, Lightbulb, Plus, X } from "lucide-react";

export default function EveningDebriefPage() {
  const [debrief, setDebrief] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [manualWins, setManualWins] = useState<string[]>([]);
  const [manualStruggles, setManualStruggles] = useState<string[]>([]);
  const [newWin, setNewWin] = useState("");
  const [newStruggle, setNewStruggle] = useState("");

  useEffect(() => {
    loadDebrief();
  }, []);

  async function loadDebrief() {
    try {
      const res = await fetch("/api/rhythm/daily?type=evening_debrief&autogenerate=true");
      const data = await res.json();
      if (res.ok && data.entries && data.entries.length > 0) {
        setDebrief(data.entries[0]);
      }
    } catch (err) {
      console.error("Failed to load debrief:", err);
    } finally {
      setLoading(false);
    }
  }

  function addWin() {
    if (newWin.trim()) {
      setManualWins([...manualWins, newWin.trim()]);
      setNewWin("");
    }
  }

  function addStruggle() {
    if (newStruggle.trim()) {
      setManualStruggles([...manualStruggles, newStruggle.trim()]);
      setNewStruggle("");
    }
  }

  function removeWin(idx: number) {
    setManualWins(manualWins.filter((_, i) => i !== idx));
  }

  function removeStruggle(idx: number) {
    setManualStruggles(manualStruggles.filter((_, i) => i !== idx));
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-950 text-zinc-100 flex items-center justify-center">
        <div className="text-zinc-400">Loading debrief...</div>
      </div>
    );
  }

  if (!debrief) {
    return (
      <div className="min-h-screen bg-zinc-950 text-zinc-100 p-6">
        <div className="max-w-2xl mx-auto text-center text-zinc-400">
          No debrief available yet. Check back later this evening.
        </div>
      </div>
    );
  }

  const data = debrief.data;
  const allWins = [...(data.wins || []), ...manualWins];
  const allStruggles = [...(data.struggles || []), ...manualStruggles];

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 p-6">
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="flex items-center gap-2">
          <Moon className="w-6 h-6 text-violet-400" />
          <h1 className="text-2xl font-bold text-white">Evening Debrief</h1>
        </div>

        <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-6 space-y-4">
          <div className="prose prose-invert max-w-none">
            <p className="text-sm text-zinc-300 whitespace-pre-line">{debrief.summary}</p>
          </div>
        </div>

        {/* Wins */}
        <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-6 space-y-4">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-green-400" />
            <h2 className="text-lg font-semibold text-white">Wins</h2>
          </div>

          <div className="space-y-2">
            {allWins.map((win, idx) => (
              <div
                key={idx}
                className="flex items-start gap-2 bg-green-500/10 border border-green-500/30 rounded-lg p-3"
              >
                <span className="text-sm text-zinc-300 flex-1">{win}</span>
                {idx >= (data.wins || []).length && (
                  <button
                    onClick={() => removeWin(idx - (data.wins || []).length)}
                    className="text-zinc-400 hover:text-zinc-300"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
            ))}
          </div>

          <div className="flex gap-2">
            <input
              type="text"
              value={newWin}
              onChange={(e) => setNewWin(e.target.value)}
              onKeyPress={(e) => e.key === "Enter" && addWin()}
              placeholder="Add a win..."
              className="flex-1 bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-violet-500"
            />
            <button
              onClick={addWin}
              className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg flex items-center gap-1 text-sm transition-colors"
            >
              <Plus className="w-4 h-4" />
              Add
            </button>
          </div>
        </div>

        {/* Struggles */}
        <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-6 space-y-4">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-amber-400" />
            <h2 className="text-lg font-semibold text-white">Struggles</h2>
          </div>

          <div className="space-y-2">
            {allStruggles.map((struggle, idx) => (
              <div
                key={idx}
                className="flex items-start gap-2 bg-amber-500/10 border border-amber-500/30 rounded-lg p-3"
              >
                <span className="text-sm text-zinc-300 flex-1">{struggle}</span>
                {idx >= (data.struggles || []).length && (
                  <button
                    onClick={() => removeStruggle(idx - (data.struggles || []).length)}
                    className="text-zinc-400 hover:text-zinc-300"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
            ))}
          </div>

          <div className="flex gap-2">
            <input
              type="text"
              value={newStruggle}
              onChange={(e) => setNewStruggle(e.target.value)}
              onKeyPress={(e) => e.key === "Enter" && addStruggle()}
              placeholder="Add a struggle..."
              className="flex-1 bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-violet-500"
            />
            <button
              onClick={addStruggle}
              className="bg-amber-600 hover:bg-amber-700 text-white px-4 py-2 rounded-lg flex items-center gap-1 text-sm transition-colors"
            >
              <Plus className="w-4 h-4" />
              Add
            </button>
          </div>
        </div>

        {/* Identity Progress */}
        {data.identityProgress && data.identityProgress.length > 0 && (
          <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-6 space-y-4">
            <div className="flex items-center gap-2">
              <Lightbulb className="w-5 h-5 text-violet-400" />
              <h2 className="text-lg font-semibold text-white">Identity Progress</h2>
            </div>

            <div className="space-y-2">
              {data.identityProgress.map((identity: any, idx: number) => (
                <div
                  key={idx}
                  className="flex items-center justify-between bg-violet-500/10 border border-violet-500/30 rounded-lg p-3"
                >
                  <span className="text-sm font-medium text-violet-400">
                    {identity.identity_name}
                  </span>
                  <span className="text-sm text-zinc-300">+{identity.xp_gained.toFixed(0)} XP</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Reflection Questions */}
        {data.suggestedReflectionQuestions && data.suggestedReflectionQuestions.length > 0 && (
          <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-6 space-y-4">
            <h2 className="text-lg font-semibold text-white flex items-center gap-2">
              <Lightbulb className="w-5 h-5 text-amber-400" />
              Reflection Questions
            </h2>

            <div className="space-y-2">
              {data.suggestedReflectionQuestions.map((question: string, idx: number) => (
                <div
                  key={idx}
                  className="text-sm text-zinc-300 bg-zinc-800/50 rounded-lg p-3"
                >
                  {question}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

