"use client";
import React, { useState, useEffect, useCallback } from "react";
import { X, Moon, Volume2, VolumeX, Clock, Target, Flame, Zap } from "lucide-react";

interface FocusModeProps {
  isOpen: boolean;
  onClose: () => void;
}

export function FocusMode({ isOpen, onClose }: FocusModeProps) {
  const [duration, setDuration] = useState(25 * 60); // 25 minutes
  const [timeLeft, setTimeLeft] = useState(duration);
  const [isRunning, setIsRunning] = useState(false);
  const [currentTask, setCurrentTask] = useState("");
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [sessionsCompleted, setSessionsCompleted] = useState(0);

  useEffect(() => {
    if (!isOpen) {
      setIsRunning(false);
      setTimeLeft(duration);
    }
  }, [isOpen, duration]);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isRunning && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft((t) => t - 1);
      }, 1000);
    } else if (timeLeft === 0 && isRunning) {
      setIsRunning(false);
      setSessionsCompleted((s) => s + 1);
      if (soundEnabled) {
        const audio = new Audio("data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2teleWhwZH11dXN1eXt4dXFvam1yfIN6cWRpa3N/h4F2Z2NncH+Ih3lsYmJmdYOIhnlqYWFmeISJiH1uZGRneYaKiH9xZmZpeoeMiIBzaGlrfYiMh4B0amtsfomOiYJ3bW5uf4qPioR5cHBwgYuQi4V6cXJyhIyRjIZ8c3R1homRjYd9dHZ3h4qRjoh+dXd5iIuSj4l/d3l7ioyTkImBeHp8i42Uko");
        audio.play().catch(() => {});
      }
    }
    return () => clearInterval(interval);
  }, [isRunning, timeLeft, soundEnabled]);

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === "Escape") onClose();
    if (e.key === " ") {
      e.preventDefault();
      setIsRunning((r) => !r);
    }
  }, [onClose]);

  useEffect(() => {
    if (isOpen) {
      document.addEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "hidden";
    }
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
    };
  }, [isOpen, handleKeyDown]);

  if (!isOpen) return null;

  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;
  const progress = ((duration - timeLeft) / duration) * 100;

  return (
    <div className="fixed inset-0 z-[100] bg-zinc-950 flex flex-col items-center justify-center">
      {/* Ambient gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-violet-950/30 via-zinc-950 to-indigo-950/30" />
      
      {/* Close button */}
      <button
        onClick={onClose}
        className="absolute top-6 right-6 p-3 text-zinc-600 hover:text-white hover:bg-zinc-800 rounded-full transition-colors z-10"
      >
        <X className="w-6 h-6" />
      </button>

      {/* Sound toggle */}
      <button
        onClick={() => setSoundEnabled(!soundEnabled)}
        className="absolute top-6 left-6 p-3 text-zinc-600 hover:text-white hover:bg-zinc-800 rounded-full transition-colors z-10"
      >
        {soundEnabled ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
      </button>

      {/* Main content */}
      <div className="relative z-10 text-center space-y-8 max-w-lg px-6">
        <div className="flex items-center justify-center gap-2 text-violet-400">
          <Moon className="w-6 h-6" />
          <span className="text-lg font-medium">Focus Mode</span>
        </div>

        {/* Timer */}
        <div className="relative">
          <svg className="w-64 h-64 mx-auto transform -rotate-90">
            <circle cx="128" cy="128" r="120" fill="none" stroke="#27272a" strokeWidth="8" />
            <circle
              cx="128" cy="128" r="120" fill="none"
              stroke="url(#focusGradient)" strokeWidth="8" strokeLinecap="round"
              strokeDasharray={2 * Math.PI * 120}
              strokeDashoffset={2 * Math.PI * 120 * (1 - progress / 100)}
              className="transition-all duration-1000"
            />
            <defs>
              <linearGradient id="focusGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#8b5cf6" />
                <stop offset="100%" stopColor="#6366f1" />
              </linearGradient>
            </defs>
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-6xl font-bold font-mono">
              {String(minutes).padStart(2, "0")}:{String(seconds).padStart(2, "0")}
            </span>
            <span className="text-zinc-500 text-sm mt-2">
              {isRunning ? "Focusing..." : timeLeft === duration ? "Ready" : "Paused"}
            </span>
          </div>
        </div>

        {/* Current task */}
        <input
          type="text"
          value={currentTask}
          onChange={(e) => setCurrentTask(e.target.value)}
          placeholder="What are you focusing on?"
          className="w-full px-4 py-3 bg-zinc-900/50 border border-zinc-800 rounded-xl text-center placeholder:text-zinc-600 focus:outline-none focus:border-violet-500"
        />

        {/* Controls */}
        <div className="flex items-center justify-center gap-4">
          <button
            onClick={() => setIsRunning(!isRunning)}
            className={`px-8 py-3 rounded-xl font-medium text-lg transition-all ${
              isRunning
                ? "bg-zinc-800 hover:bg-zinc-700 text-white"
                : "bg-violet-600 hover:bg-violet-500 text-white"
            }`}
          >
            {isRunning ? "Pause" : timeLeft === duration ? "Start Focus" : "Resume"}
          </button>
          {timeLeft !== duration && (
            <button
              onClick={() => { setTimeLeft(duration); setIsRunning(false); }}
              className="px-4 py-3 bg-zinc-800 hover:bg-zinc-700 rounded-xl text-zinc-400"
            >
              Reset
            </button>
          )}
        </div>

        {/* Duration presets */}
        <div className="flex items-center justify-center gap-2">
          {[15, 25, 45, 60].map((mins) => (
            <button
              key={mins}
              onClick={() => { setDuration(mins * 60); setTimeLeft(mins * 60); setIsRunning(false); }}
              className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${
                duration === mins * 60 ? "bg-violet-600 text-white" : "bg-zinc-800 text-zinc-400 hover:text-white"
              }`}
            >
              {mins}m
            </button>
          ))}
        </div>

        {/* Stats */}
        <div className="flex items-center justify-center gap-6 text-sm text-zinc-500">
          <div className="flex items-center gap-1">
            <Flame className="w-4 h-4 text-orange-400" />
            <span>{sessionsCompleted} sessions</span>
          </div>
          <div className="flex items-center gap-1">
            <Zap className="w-4 h-4 text-amber-400" />
            <span>+{sessionsCompleted * 25} XP earned</span>
          </div>
        </div>

        {/* Hint */}
        <p className="text-xs text-zinc-600">
          Press <kbd className="px-1.5 py-0.5 bg-zinc-800 rounded">Space</kbd> to pause/resume • <kbd className="px-1.5 py-0.5 bg-zinc-800 rounded">Esc</kbd> to exit
        </p>
      </div>
    </div>
  );
}

export default FocusMode;
