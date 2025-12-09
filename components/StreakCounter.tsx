"use client";

import { useState, useEffect } from 'react';
import { Flame, Zap, Trophy, Star } from 'lucide-react';

interface StreakCounterProps {
  count: number;
  label?: string;
  showAnimation?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export function StreakCounter({
  count,
  label = 'streak',
  showAnimation = true,
  size = 'md',
}: StreakCounterProps) {
  const [isAnimating, setIsAnimating] = useState(false);
  const [prevCount, setPrevCount] = useState(count);

  // Trigger animation on count increase
  useEffect(() => {
    if (count > prevCount && showAnimation) {
      setIsAnimating(true);
      setTimeout(() => setIsAnimating(false), 600);
    }
    setPrevCount(count);
  }, [count, prevCount, showAnimation]);

  // Size variants
  const sizes = {
    sm: {
      container: 'px-2 py-1',
      icon: 'w-4 h-4',
      text: 'text-sm',
      label: 'text-xs',
    },
    md: {
      container: 'px-3 py-2',
      icon: 'w-5 h-5',
      text: 'text-lg',
      label: 'text-sm',
    },
    lg: {
      container: 'px-4 py-3',
      icon: 'w-6 h-6',
      text: 'text-2xl',
      label: 'text-base',
    },
  };

  // Get streak tier for styling
  const getTier = () => {
    if (count >= 10) return { color: 'from-amber-500 to-orange-600', icon: Trophy, tier: 'legendary' };
    if (count >= 7) return { color: 'from-violet-500 to-purple-600', icon: Star, tier: 'epic' };
    if (count >= 5) return { color: 'from-orange-500 to-red-600', icon: Flame, tier: 'hot' };
    if (count >= 3) return { color: 'from-yellow-500 to-amber-500', icon: Flame, tier: 'warming' };
    return { color: 'from-zinc-500 to-zinc-600', icon: Zap, tier: 'starting' };
  };

  const { color, icon: Icon, tier } = getTier();
  const s = sizes[size];

  if (count === 0) {
    return (
      <div className={`${s.container} bg-zinc-800/50 rounded-lg flex items-center gap-2`}>
        <Zap className={`${s.icon} text-zinc-600`} />
        <span className={`${s.label} text-zinc-500`}>Start a streak!</span>
      </div>
    );
  }

  return (
    <div
      className={`
        ${s.container} 
        bg-gradient-to-r ${color} 
        rounded-lg flex items-center gap-2
        ${isAnimating ? 'scale-110 animate-pulse' : ''}
        transition-transform duration-300
        shadow-lg
      `}
    >
      <Icon className={`${s.icon} text-white ${count >= 5 ? 'animate-pulse' : ''}`} />
      <div className="flex items-baseline gap-1">
        <span className={`${s.text} font-bold text-white`}>{count}</span>
        <span className={`${s.label} text-white/80`}>{label}</span>
      </div>
    </div>
  );
}

// Full streak display with history
interface StreakDisplayProps {
  currentStreak: number;
  bestStreak: number;
  todayCompleted: number;
  weekHistory?: number[]; // Last 7 days
}

export function StreakDisplay({
  currentStreak,
  bestStreak,
  todayCompleted,
  weekHistory = [],
}: StreakDisplayProps) {
  return (
    <div className="bg-gradient-to-br from-orange-900/30 to-red-900/30 border border-orange-500/30 rounded-2xl p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <Flame className="w-5 h-5 text-orange-400" />
          Momentum
        </h2>
        <StreakCounter count={currentStreak} size="md" />
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-4">
        <div className="text-center">
          <div className="text-2xl font-bold text-orange-400">{currentStreak}</div>
          <div className="text-xs text-zinc-500">Current</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-amber-400">{bestStreak}</div>
          <div className="text-xs text-zinc-500">Best</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-yellow-400">{todayCompleted}</div>
          <div className="text-xs text-zinc-500">Today</div>
        </div>
      </div>

      {/* Week history */}
      {weekHistory.length > 0 && (
        <div>
          <div className="text-xs text-zinc-500 mb-2">This week</div>
          <div className="flex gap-1">
            {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((day, i) => {
              const value = weekHistory[i] || 0;
              const intensity = Math.min(value / 5, 1); // 5 = max intensity
              return (
                <div key={i} className="flex-1 text-center">
                  <div
                    className={`h-8 rounded mb-1 transition-colors ${
                      value > 0
                        ? `bg-orange-500`
                        : 'bg-zinc-800'
                    }`}
                    style={{ opacity: value > 0 ? 0.3 + intensity * 0.7 : 1 }}
                    title={`${value} completed`}
                  />
                  <span className="text-[10px] text-zinc-600">{day}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Encouragement */}
      {currentStreak > 0 && (
        <div className="mt-4 pt-4 border-t border-orange-500/20">
          <p className="text-sm text-center">
            {currentStreak >= 10 && <span className="text-orange-300">🏆 Legendary streak! You're unstoppable!</span>}
            {currentStreak >= 7 && currentStreak < 10 && <span className="text-violet-300">⭐ Epic streak! Keep the fire burning!</span>}
            {currentStreak >= 5 && currentStreak < 7 && <span className="text-orange-300">🔥 You're on fire! Don't stop now!</span>}
            {currentStreak >= 3 && currentStreak < 5 && <span className="text-yellow-300">⚡ Building momentum! One more!</span>}
            {currentStreak < 3 && <span className="text-zinc-400">Keep going! Streaks build fast.</span>}
          </p>
        </div>
      )}
    </div>
  );
}
