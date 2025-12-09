"use client";

import { useState } from "react";
import { Sparkles, Play, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";

export function SimulationTeaser() {
  const router = useRouter();
  const [question, setQuestion] = useState("");
  const [loading, setLoading] = useState(false);

  const handleQuickSimulation = async () => {
    if (!question.trim()) return;
    setLoading(true);
    // Navigate to life-intelligence with question
    router.push(`/life-intelligence?tab=simulation&q=${encodeURIComponent(question)}`);
  };

  return (
    <div className="bg-gradient-to-br from-violet-500/10 to-pink-500/10 rounded-2xl p-6 border border-violet-500/20">
      <div className="flex items-center gap-3 mb-4">
        <div className="p-2 bg-violet-500/20 rounded-lg">
          <Sparkles className="w-5 h-5 text-violet-400" />
        </div>
        <h3 className="font-semibold text-lg">Life Simulation</h3>
      </div>

      <p className="text-zinc-400 text-sm mb-4">
        Explore "what if" scenarios and simulate different life decisions.
      </p>

      <input
        type="text"
        value={question}
        onChange={(e) => setQuestion(e.target.value)}
        placeholder="What if I..."
        className="w-full bg-zinc-900/50 border border-zinc-700 rounded-lg px-4 py-2 text-white placeholder-zinc-500 text-sm mb-3 focus:outline-none focus:border-violet-500"
        onKeyDown={(e) => e.key === "Enter" && handleQuickSimulation()}
      />

      <button
        onClick={handleQuickSimulation}
        disabled={!question.trim() || loading}
        className="w-full py-2 bg-gradient-to-r from-violet-500 to-pink-500 rounded-lg font-medium text-sm disabled:opacity-50 flex items-center justify-center gap-2"
      >
        {loading ? (
          <><Loader2 className="w-4 h-4 animate-spin" /> Simulating...</>
        ) : (
          <><Play className="w-4 h-4" /> Run Simulation</>
        )}
      </button>

      <button
        onClick={() => router.push("/life-intelligence?tab=simulation")}
        className="w-full mt-2 py-2 bg-zinc-800/50 hover:bg-zinc-700/50 rounded-lg text-sm text-zinc-400"
      >
        View Past Simulations
      </button>
    </div>
  );
}