"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  Play,
  Pause,
  RotateCcw,
  Coffee,
  Brain,
  Zap,
  Settings,
  Volume2,
  VolumeX,
  Target,
  CheckCircle2,
} from "lucide-react";

type TimerMode = "focus" | "shortBreak" | "longBreak";

interface PomodoroSettings {
  focusMinutes: number;
  shortBreakMinutes: number;
  longBreakMinutes: number;
  sessionsUntilLongBreak: number;
  autoStartBreaks: boolean;
  autoStartFocus: boolean;
  soundEnabled: boolean;
}

interface PomodoroStats {
  completedToday: number;
  totalMinutesToday: number;
  currentStreak: number;
  xpEarned: number;
}

const DEFAULT_SETTINGS: PomodoroSettings = {
  focusMinutes: 25,
  shortBreakMinutes: 5,
  longBreakMinutes: 15,
  sessionsUntilLongBreak: 4,
  autoStartBreaks: false,
  autoStartFocus: false,
  soundEnabled: true,
};

const MODE_CONFIG: Record<TimerMode, { label: string; color: string; icon: any; xp: number }> = {
  focus: { label: "Focus", color: "from-red-500 to-orange-500", icon: Brain, xp: 25 },
  shortBreak: { label: "Short Break", color: "from-emerald-500 to-teal-500", icon: Coffee, xp: 5 },
  longBreak: { label: "Long Break", color: "from-blue-500 to-cyan-500", icon: Coffee, xp: 10 },
};

export function PomodoroTimer() {
  const [settings, setSettings] = useState<PomodoroSettings>(DEFAULT_SETTINGS);
  const [mode, setMode] = useState<TimerMode>("focus");
  const [timeLeft, setTimeLeft] = useState(settings.focusMinutes * 60);
  const [isRunning, setIsRunning] = useState(false);
  const [sessionsCompleted, setSessionsCompleted] = useState(0);
  const [showSettings, setShowSettings] = useState(false);
  const [stats, setStats] = useState<PomodoroStats>({
    completedToday: 0,
    totalMinutesToday: 0,
    currentStreak: 0,
    xpEarned: 0,
  });
  const [currentTask, setCurrentTask] = useState("");
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Load settings from localStorage
  useEffect(() => {
    const saved = localStorage.getItem("pomodoro_settings");
    if (saved) {
      const parsed = JSON.parse(saved);
      setSettings(parsed);
      setTimeLeft(parsed.focusMinutes * 60);
    }

    const savedStats = localStorage.getItem("pomodoro_stats_today");
    if (savedStats) {
      const parsed = JSON.parse(savedStats);
      // Check if it's still today
      if (parsed.date === new Date().toDateString()) {
        setStats(parsed.stats);
      }
    }
  }, []);

  // Save settings
  useEffect(() => {
    localStorage.setItem("pomodoro_settings", JSON.stringify(settings));
  }, [settings]);

  // Save stats
  useEffect(() => {
    localStorage.setItem(
      "pomodoro_stats_today",
      JSON.stringify({ date: new Date().toDateString(), stats })
    );
  }, [stats]);

  // Timer logic
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;

    if (isRunning && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft((prev) => prev - 1);
      }, 1000);
    } else if (timeLeft === 0) {
      handleTimerComplete();
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isRunning, timeLeft]);

  const handleTimerComplete = useCallback(async () => {
    setIsRunning(false);

    // Play sound
    if (settings.soundEnabled) {
      playNotificationSound();
    }

    // Award XP
    const xpEarned = MODE_CONFIG[mode].xp;
    await awardXP(xpEarned, mode);

    if (mode === "focus") {
      const newSessionsCompleted = sessionsCompleted + 1;
      setSessionsCompleted(newSessionsCompleted);

      // Update stats
      setStats((prev) => ({
        ...prev,
        completedToday: prev.completedToday + 1,
        totalMinutesToday: prev.totalMinutesToday + settings.focusMinutes,
        currentStreak: prev.currentStreak + 1,
        xpEarned: prev.xpEarned + xpEarned,
      }));

      // Determine next break type
      const isLongBreak = newSessionsCompleted % settings.sessionsUntilLongBreak === 0;
      const nextMode = isLongBreak ? "longBreak" : "shortBreak";

      setMode(nextMode);
      setTimeLeft(
        isLongBreak ? settings.longBreakMinutes * 60 : settings.shortBreakMinutes * 60
      );

      if (settings.autoStartBreaks) {
        setIsRunning(true);
      }
    } else {
      // Break completed, back to focus
      setMode("focus");
      setTimeLeft(settings.focusMinutes * 60);

      if (settings.autoStartFocus) {
        setIsRunning(true);
      }
    }
  }, [mode, sessionsCompleted, settings]);

  async function awardXP(amount: number, timerMode: TimerMode) {
    try {
      await fetch("/api/xp/log", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          activity: `Pomodoro ${MODE_CONFIG[timerMode].label}`,
          xp: amount,
          category: "IXP", // Inner XP for focus work
          source: "pomodoro",
        }),
      });
    } catch (err) {
      console.error("Failed to award XP:", err);
    }
  }

  function playNotificationSound() {
    // Use Web Audio API for a simple beep
    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);

      oscillator.frequency.value = 800;
      oscillator.type = "sine";
      gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);

      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.5);
    } catch (err) {
      console.log("Audio not supported");
    }
  }

  function toggleTimer() {
    setIsRunning((prev) => !prev);
  }

  function resetTimer() {
    setIsRunning(false);
    setTimeLeft(getModeMinutes(mode) * 60);
  }

  function switchMode(newMode: TimerMode) {
    setIsRunning(false);
    setMode(newMode);
    setTimeLeft(getModeMinutes(newMode) * 60);
  }

  function getModeMinutes(m: TimerMode): number {
    switch (m) {
      case "focus":
        return settings.focusMinutes;
      case "shortBreak":
        return settings.shortBreakMinutes;
      case "longBreak":
        return settings.longBreakMinutes;
    }
  }

  function formatTime(seconds: number): string {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  }

  const progress = ((getModeMinutes(mode) * 60 - timeLeft) / (getModeMinutes(mode) * 60)) * 100;
  const ModeIcon = MODE_CONFIG[mode].icon;

  return (
    <div className="bg-zinc-900/80 backdrop-blur-sm rounded-2xl border border-zinc-800/50 p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <Brain className="w-5 h-5 text-red-400" />
          <h2 className="text-lg font-semibold">Pomodoro Timer</h2>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setSettings((s) => ({ ...s, soundEnabled: !s.soundEnabled }))}
            className="p-2 hover:bg-zinc-800 rounded-lg transition-colors"
          >
            {settings.soundEnabled ? (
              <Volume2 className="w-4 h-4 text-zinc-400" />
            ) : (
              <VolumeX className="w-4 h-4 text-zinc-600" />
            )}
          </button>
          <button
            onClick={() => setShowSettings(!showSettings)}
            className="p-2 hover:bg-zinc-800 rounded-lg transition-colors"
          >
            <Settings className="w-4 h-4 text-zinc-400" />
          </button>
        </div>
      </div>

      {/* Mode tabs */}
      <div className="flex gap-2 mb-6">
        {(["focus", "shortBreak", "longBreak"] as TimerMode[]).map((m) => {
          const config = MODE_CONFIG[m];
          const Icon = config.icon;
          return (
            <button
              key={m}
              onClick={() => switchMode(m)}
              className={`
                flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-2
                ${mode === m
                  ? `bg-gradient-to-r ${config.color} text-white`
                  : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700"
                }
              `}
            >
              <Icon className="w-4 h-4" />
              {config.label}
            </button>
          );
        })}
      </div>

      {/* Current task input */}
      <div className="mb-6">
        <input
          type="text"
          value={currentTask}
          onChange={(e) => setCurrentTask(e.target.value)}
          placeholder="What are you working on?"
          className="w-full px-4 py-2 bg-zinc-800/50 border border-zinc-700 rounded-lg text-sm placeholder-zinc-500 focus:border-violet-500 focus:outline-none"
        />
      </div>

      {/* Timer display */}
      <div className="relative mb-6">
        {/* Progress ring */}
        <div className="relative w-48 h-48 mx-auto">
          <svg className="w-full h-full transform -rotate-90">
            {/* Background circle */}
            <circle
              cx="96"
              cy="96"
              r="88"
              fill="none"
              stroke="currentColor"
              strokeWidth="8"
              className="text-zinc-800"
            />
            {/* Progress circle */}
            <circle
              cx="96"
              cy="96"
              r="88"
              fill="none"
              stroke="url(#gradient)"
              strokeWidth="8"
              strokeLinecap="round"
              strokeDasharray={`${2 * Math.PI * 88}`}
              strokeDashoffset={`${2 * Math.PI * 88 * (1 - progress / 100)}`}
              className="transition-all duration-1000"
            />
            <defs>
              <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor={mode === "focus" ? "#ef4444" : "#10b981"} />
                <stop offset="100%" stopColor={mode === "focus" ? "#f97316" : "#14b8a6"} />
              </linearGradient>
            </defs>
          </svg>

          {/* Time display */}
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <ModeIcon className={`w-6 h-6 mb-2 ${mode === "focus" ? "text-red-400" : "text-emerald-400"}`} />
            <div className="text-4xl font-mono font-bold">{formatTime(timeLeft)}</div>
            <div className="text-sm text-zinc-500 mt-1">{MODE_CONFIG[mode].label}</div>
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="flex items-center justify-center gap-4 mb-6">
        <button
          onClick={resetTimer}
          className="p-3 bg-zinc-800 hover:bg-zinc-700 rounded-full transition-colors"
        >
          <RotateCcw className="w-5 h-5" />
        </button>
        <button
          onClick={toggleTimer}
          className={`
            p-4 rounded-full transition-all shadow-lg
            ${isRunning
              ? "bg-zinc-700 hover:bg-zinc-600"
              : `bg-gradient-to-r ${MODE_CONFIG[mode].color} hover:opacity-90`
            }
          `}
        >
          {isRunning ? (
            <Pause className="w-8 h-8" />
          ) : (
            <Play className="w-8 h-8 ml-1" />
          )}
        </button>
        <div className="p-3 bg-zinc-800 rounded-full">
          <div className="w-5 h-5 flex items-center justify-center text-sm font-bold text-zinc-400">
            {sessionsCompleted}
          </div>
        </div>
      </div>

      {/* Session indicators */}
      <div className="flex items-center justify-center gap-2 mb-6">
        {Array.from({ length: settings.sessionsUntilLongBreak }).map((_, idx) => (
          <div
            key={idx}
            className={`
              w-3 h-3 rounded-full transition-all
              ${idx < sessionsCompleted % settings.sessionsUntilLongBreak
                ? "bg-red-500"
                : "bg-zinc-700"
              }
            `}
          />
        ))}
      </div>

      {/* Today's stats */}
      <div className="grid grid-cols-4 gap-3 p-4 bg-zinc-800/30 rounded-xl">
        <div className="text-center">
          <div className="text-xl font-bold text-red-400">{stats.completedToday}</div>
          <div className="text-[10px] text-zinc-500">Sessions</div>
        </div>
        <div className="text-center">
          <div className="text-xl font-bold text-emerald-400">{stats.totalMinutesToday}</div>
          <div className="text-[10px] text-zinc-500">Minutes</div>
        </div>
        <div className="text-center">
          <div className="text-xl font-bold text-orange-400">{stats.currentStreak}</div>
          <div className="text-[10px] text-zinc-500">Streak</div>
        </div>
        <div className="text-center">
          <div className="text-xl font-bold text-violet-400">+{stats.xpEarned}</div>
          <div className="text-[10px] text-zinc-500">XP</div>
        </div>
      </div>

      {/* Settings panel */}
      {showSettings && (
        <div className="mt-4 p-4 bg-zinc-800/50 rounded-xl border border-zinc-700">
          <h3 className="font-semibold mb-4 flex items-center gap-2">
            <Settings className="w-4 h-4" />
            Timer Settings
          </h3>
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-xs text-zinc-500 mb-1">Focus (min)</label>
                <input
                  type="number"
                  value={settings.focusMinutes}
                  onChange={(e) => {
                    const val = parseInt(e.target.value) || 25;
                    setSettings((s) => ({ ...s, focusMinutes: val }));
                    if (mode === "focus" && !isRunning) setTimeLeft(val * 60);
                  }}
                  className="w-full px-3 py-2 bg-zinc-900 border border-zinc-700 rounded-lg text-center"
                  min={1}
                  max={60}
                />
              </div>
              <div>
                <label className="block text-xs text-zinc-500 mb-1">Short Break</label>
                <input
                  type="number"
                  value={settings.shortBreakMinutes}
                  onChange={(e) => {
                    const val = parseInt(e.target.value) || 5;
                    setSettings((s) => ({ ...s, shortBreakMinutes: val }));
                    if (mode === "shortBreak" && !isRunning) setTimeLeft(val * 60);
                  }}
                  className="w-full px-3 py-2 bg-zinc-900 border border-zinc-700 rounded-lg text-center"
                  min={1}
                  max={30}
                />
              </div>
              <div>
                <label className="block text-xs text-zinc-500 mb-1">Long Break</label>
                <input
                  type="number"
                  value={settings.longBreakMinutes}
                  onChange={(e) => {
                    const val = parseInt(e.target.value) || 15;
                    setSettings((s) => ({ ...s, longBreakMinutes: val }));
                    if (mode === "longBreak" && !isRunning) setTimeLeft(val * 60);
                  }}
                  className="w-full px-3 py-2 bg-zinc-900 border border-zinc-700 rounded-lg text-center"
                  min={1}
                  max={60}
                />
              </div>
            </div>
            <div className="space-y-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.autoStartBreaks}
                  onChange={(e) => setSettings((s) => ({ ...s, autoStartBreaks: e.target.checked }))}
                  className="rounded border-zinc-600"
                />
                <span className="text-sm text-zinc-400">Auto-start breaks</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.autoStartFocus}
                  onChange={(e) => setSettings((s) => ({ ...s, autoStartFocus: e.target.checked }))}
                  className="rounded border-zinc-600"
                />
                <span className="text-sm text-zinc-400">Auto-start focus after break</span>
              </label>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Compact widget version
export function PomodoroWidget() {
  const [timeLeft, setTimeLeft] = useState(25 * 60);
  const [isRunning, setIsRunning] = useState(false);

  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    if (isRunning && timeLeft > 0) {
      interval = setInterval(() => setTimeLeft((p) => p - 1), 1000);
    }
    return () => { if (interval) clearInterval(interval); };
  }, [isRunning, timeLeft]);

  const mins = Math.floor(timeLeft / 60);
  const secs = timeLeft % 60;

  return (
    <div className="flex items-center gap-3 px-4 py-2 bg-zinc-800/50 rounded-xl">
      <Brain className="w-4 h-4 text-red-400" />
      <span className="font-mono font-bold">
        {String(mins).padStart(2, "0")}:{String(secs).padStart(2, "0")}
      </span>
      <button
        onClick={() => setIsRunning(!isRunning)}
        className="p-1.5 bg-zinc-700 hover:bg-zinc-600 rounded-lg"
      >
        {isRunning ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
      </button>
    </div>
  );
}

export default PomodoroTimer;
