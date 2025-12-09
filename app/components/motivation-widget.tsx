"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Flame, ArrowRight, Sparkles, RefreshCw } from "lucide-react";

interface QuickMotivation {
  message: string;
  persona: string;
}

const QUICK_MOTIVATIONS: QuickMotivation[] = [
  {
    message: "The obstacle in the path becomes the path. Use it.",
    persona: "Marcus Aurelius",
  },
  {
    message: "Discipline equals freedom. Get after it.",
    persona: "Jocko Willink",
  },
  {
    message: "You're only using 40% of what you're capable of.",
    persona: "David Goggins",
  },
  {
    message: "The present moment is all you have. Use it wisely.",
    persona: "Eckhart Tolle",
  },
  {
    message: "Start before you're ready. The muse favors working artists.",
    persona: "Steven Pressfield",
  },
  {
    message: "5-4-3-2-1 and move. Don't let your brain talk you out of it.",
    persona: "Mel Robbins",
  },
  {
    message: "Every action is a vote for the type of person you want to become.",
    persona: "James Clear",
  },
  {
    message: "It always seems impossible until it's done.",
    persona: "Nelson Mandela",
  },
];

export function MotivationWidget() {
  const [currentIndex, setCurrentIndex] = useState(
    Math.floor(Math.random() * QUICK_MOTIVATIONS.length)
  );
  const [isRefreshing, setIsRefreshing] = useState(false);

  const current = QUICK_MOTIVATIONS[currentIndex];

  function refresh() {
    setIsRefreshing(true);
    setTimeout(() => {
      let newIndex;
      do {
        newIndex = Math.floor(Math.random() * QUICK_MOTIVATIONS.length);
      } while (newIndex === currentIndex && QUICK_MOTIVATIONS.length > 1);
      setCurrentIndex(newIndex);
      setIsRefreshing(false);
    }, 300);
  }

  return (
    <div className="bg-gradient-to-br from-orange-950/40 to-zinc-900 rounded-2xl border border-orange-500/20 p-5">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Flame className="w-5 h-5 text-orange-400" />
          <h3 className="font-semibold">Daily Spark</h3>
        </div>
        <button
          onClick={refresh}
          className="p-1.5 hover:bg-zinc-800 rounded-lg transition-colors"
          disabled={isRefreshing}
        >
          <RefreshCw
            className={`w-4 h-4 text-zinc-500 ${
              isRefreshing ? "animate-spin" : ""
            }`}
          />
        </button>
      </div>

      {/* Quote */}
      <div
        className={`transition-opacity duration-300 ${
          isRefreshing ? "opacity-0" : "opacity-100"
        }`}
      >
        <p className="text-zinc-200 leading-relaxed mb-2">"{current.message}"</p>
        <p className="text-sm text-orange-400/70">— {current.persona}</p>
      </div>

      {/* CTA */}
      <Link
        href="/motivation"
        className="mt-4 w-full py-2.5 bg-orange-600/20 hover:bg-orange-600/30 text-orange-400 rounded-xl text-sm font-medium flex items-center justify-center gap-2 transition-colors"
      >
        <Sparkles className="w-4 h-4" />
        Need a boost?
        <ArrowRight className="w-4 h-4" />
      </Link>
    </div>
  );
}

export default MotivationWidget;
