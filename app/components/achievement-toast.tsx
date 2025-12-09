"use client";

import React, { useState, useEffect } from "react";
import { Trophy, X, Sparkles } from "lucide-react";

interface UnlockedBadge {
  id: string;
  name: string;
  description: string;
  icon: string;
  rarity: string;
  xpReward: number;
  rarityConfig: {
    color: string;
    bgColor: string;
    borderColor: string;
  };
}

interface AchievementToastProps {
  badge: UnlockedBadge | null;
  onClose: () => void;
  autoDismiss?: number; // ms
}

export function AchievementToast({ badge, onClose, autoDismiss = 5000 }: AchievementToastProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [isLeaving, setIsLeaving] = useState(false);

  useEffect(() => {
    if (badge) {
      setIsVisible(true);
      setIsLeaving(false);

      const timer = setTimeout(() => {
        handleClose();
      }, autoDismiss);

      return () => clearTimeout(timer);
    }
  }, [badge, autoDismiss]);

  function handleClose() {
    setIsLeaving(true);
    setTimeout(() => {
      setIsVisible(false);
      onClose();
    }, 300);
  }

  if (!badge || !isVisible) return null;

  const rarityGradients: Record<string, string> = {
    common: "from-zinc-600 to-zinc-700",
    uncommon: "from-emerald-600 to-emerald-700",
    rare: "from-blue-600 to-blue-700",
    epic: "from-purple-600 to-purple-700",
    legendary: "from-amber-500 to-orange-600",
  };

  const gradient = rarityGradients[badge.rarity] || rarityGradients.common;

  return (
    <div
      className={`
        fixed top-6 right-6 z-[100] max-w-sm
        transition-all duration-300 ease-out
        ${isLeaving ? "opacity-0 translate-x-4" : "opacity-100 translate-x-0"}
      `}
    >
      <div
        className={`
          bg-gradient-to-r ${gradient} rounded-2xl p-1 shadow-2xl
          ${badge.rarity === "legendary" ? "animate-pulse-slow" : ""}
        `}
      >
        <div className="bg-zinc-900 rounded-xl p-4">
          {/* Header */}
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2 text-amber-400">
              <Trophy className="w-5 h-5" />
              <span className="text-sm font-semibold uppercase tracking-wide">Achievement Unlocked!</span>
            </div>
            <button
              onClick={handleClose}
              className="p-1 hover:bg-zinc-800 rounded-lg transition-colors"
            >
              <X className="w-4 h-4 text-zinc-500" />
            </button>
          </div>

          {/* Badge */}
          <div className="flex items-center gap-4">
            <div
              className={`
                w-16 h-16 rounded-xl flex items-center justify-center text-3xl
                ${badge.rarityConfig.bgColor}
              `}
            >
              {badge.icon}
            </div>
            <div className="flex-1">
              <div className="font-bold text-white">{badge.name}</div>
              <div className="text-sm text-zinc-400">{badge.description}</div>
              <div className="flex items-center gap-1 mt-1 text-amber-400">
                <Sparkles className="w-3 h-3" />
                <span className="text-sm font-semibold">+{badge.xpReward} XP</span>
              </div>
            </div>
          </div>

          {/* Rarity tag */}
          <div className="mt-3 flex items-center justify-between">
            <span
              className="px-2 py-0.5 rounded-full text-xs font-medium capitalize"
              style={{
                backgroundColor: `${badge.rarityConfig.color}20`,
                color: badge.rarityConfig.color,
              }}
            >
              {badge.rarity}
            </span>
            <a
              href="/achievements"
              className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
            >
              View all badges →
            </a>
          </div>
        </div>
      </div>

      {/* Confetti effect for legendary */}
      {badge.rarity === "legendary" && (
        <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-2xl">
          {[...Array(20)].map((_, i) => (
            <div
              key={i}
              className="absolute w-2 h-2 rounded-full animate-confetti"
              style={{
                left: `${Math.random() * 100}%`,
                backgroundColor: ["#f59e0b", "#fbbf24", "#fcd34d", "#ffffff"][Math.floor(Math.random() * 4)],
                animationDelay: `${Math.random() * 0.5}s`,
                animationDuration: `${1 + Math.random()}s`,
              }}
            />
          ))}
        </div>
      )}

      <style jsx>{`
        @keyframes confetti {
          0% {
            transform: translateY(-10px) rotate(0deg);
            opacity: 1;
          }
          100% {
            transform: translateY(100px) rotate(720deg);
            opacity: 0;
          }
        }
        .animate-confetti {
          animation: confetti 1.5s ease-out forwards;
        }
        .animate-pulse-slow {
          animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
        }
        @keyframes pulse {
          0%, 100% {
            opacity: 1;
          }
          50% {
            opacity: 0.85;
          }
        }
      `}</style>
    </div>
  );
}

// Hook for managing achievement toasts
export function useAchievementToast() {
  const [queue, setQueue] = useState<UnlockedBadge[]>([]);
  const [current, setCurrent] = useState<UnlockedBadge | null>(null);

  useEffect(() => {
    if (!current && queue.length > 0) {
      setCurrent(queue[0]);
      setQueue((prev) => prev.slice(1));
    }
  }, [current, queue]);

  function showAchievement(badge: UnlockedBadge) {
    setQueue((prev) => [...prev, badge]);
  }

  function dismissCurrent() {
    setCurrent(null);
  }

  return {
    current,
    showAchievement,
    dismissCurrent,
    queueLength: queue.length,
  };
}

export default AchievementToast;
