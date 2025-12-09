"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useAuth } from "@clerk/nextjs";
import {
  Zap, Target, Clock, CheckCircle2, Circle, Play, Pause, RotateCcw,
  Loader2, ArrowRight, Flame, Brain, Sparkles, Plus, Inbox, AlertTriangle, Timer,
} from "lucide-react";

interface Task {
  id: string;
  title: string;
  priority: string;
  status: string;
  due_date?: string;
  ai_score?: number;
}

export default function ProductivityDashboard() {
  const { userId, isLoaded } = useAuth();
  const [loading, setLoading] = useState(true);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [flowPrediction, setFlowPrediction] = useState<"low" | "medium" | "high">("medium");
  const [nextFocusBlock, setNextFocusBlock] = useState("");
  const [timerActive, setTimerActive] = useState(false);
  const [timerSeconds, setTimerSeconds] = useState(25 * 60);
  const [timerMode, setTimerMode] = useState<"focus" | "break">("focus");

  useEffect(() => {
    if (!isLoaded || !userId) return;
    fetchData();
  }, [userId, isLoaded]);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (timerActive && timerSeconds > 0) {
      interval = setInterval(() => setTimerSeconds((s) => s - 1), 1000);
    } else if (timerSeconds === 0) setTimerActive(false);
    return () => clearInterval(interval);
  }, [timerActive, timerSeconds]);

  async function fetchData() {
    try {
      const [tasksRes, emotionRes] = await Promise.all([
        fetch("/api/tasks?status=pending,in_progress&limit=30"),
        fetch("/api/emotion?limit=3"),
      ]);
      if (tasksRes.ok) {
        const data = await tasksRes.json();
        const scored = (data.tasks || []).map((t: Task) => {
          let score = 0;
          if (t.priority === "critical") score += 100;
          else if (t.priority === "high") score += 70;
          else if (t.priority === "medium") score += 40;
          else score += 10;
          if (t.due_date) {
            const daysUntil = Math.ceil((new Date(t.due_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
            if (daysUntil <= 0) score += 50;
            else if (daysUntil <= 1) score += 30;
            else if (daysUntil <= 3) score += 15;
          }
          return { ...t, ai_score: score };
        });
        scored.sort((a: Task, b: Task) => (b.ai_score || 0) - (a.ai_score || 0));
        setTasks(scored);
      }
      if (emotionRes.ok) {
        const data = await emotionRes.json();
        const states = data.states || [];
        const avgEnergy = states.length > 0 ? states.reduce((s: number, e: any) => s + (e.intensity || 0.5), 0) / states.length : 0.5;
        if (avgEnergy > 0.7) { setFlowPrediction("high"); setNextFocusBlock("Now is optimal for deep work"); }
        else if (avgEnergy > 0.4) { setFlowPrediction("medium"); setNextFocusBlock("Good for moderate complexity tasks"); }
        else { setFlowPrediction("low"); setNextFocusBlock("Consider lighter tasks or a break"); }
      }
    } catch (error) { console.error("Failed to fetch data:", error); }
    finally { setLoading(false); }
  }

  function formatTime(seconds: number) {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  }

  function resetTimer() {
    setTimerActive(false);
    setTimerSeconds(timerMode === "focus" ? 25 * 60 : 5 * 60);
  }

  const doFirst = tasks.filter((t) => (t.ai_score || 0) >= 100);
  const schedule = tasks.filter((t) => (t.ai_score || 0) >= 50 && (t.ai_score || 0) < 100);
  const delegate = tasks.filter((t) => (t.ai_score || 0) >= 20 && (t.ai_score || 0) < 50);
  const eliminate = tasks.filter((t) => (t.ai_score || 0) < 20);
  const topTask = tasks[0];

  if (!isLoaded || loading) return <div className="min-h-screen bg-zinc-950 text-white flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-violet-500" /></div>;

  return (
    <div className="min-h-screen bg-gradient-to-br from-zinc-950 via-zinc-900 to-zinc-950 text-white p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-gradient-to-br from-orange-500/20 to-yellow-500/20 rounded-xl"><Zap className="w-8 h-8 text-orange-400" /></div>
            <div><h1 className="text-3xl font-bold">Flow Engine</h1><p className="text-zinc-400">Optimize your execution</p></div>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/tasks" className="flex items-center gap-2 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 rounded-lg"><Plus className="w-4 h-4" />Add Task</Link>
          </div>
        </div>

        <div className={`rounded-2xl p-5 border ${flowPrediction === "high" ? "bg-green-500/10 border-green-500/30" : flowPrediction === "medium" ? "bg-amber-500/10 border-amber-500/30" : "bg-red-500/10 border-red-500/30"}`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className={`p-3 rounded-xl ${flowPrediction === "high" ? "bg-green-500/20" : flowPrediction === "medium" ? "bg-amber-500/20" : "bg-red-500/20"}`}>
                <Brain className={`w-6 h-6 ${flowPrediction === "high" ? "text-green-400" : flowPrediction === "medium" ? "text-amber-400" : "text-red-400"}`} />
              </div>
              <div>
                <div className="flex items-center gap-2"><span className="font-bold">Today's Flow Prediction:</span>
                  <span className={`px-2 py-0.5 rounded-full text-sm font-medium ${flowPrediction === "high" ? "bg-green-500/20 text-green-400" : flowPrediction === "medium" ? "bg-amber-500/20 text-amber-400" : "bg-red-500/20 text-red-400"}`}>{flowPrediction.toUpperCase()}</span>
                </div>
                <p className="text-zinc-400 text-sm">{nextFocusBlock}</p>
              </div>
            </div>
            <Link href="/pomodoro" className="flex items-center gap-2 px-5 py-2.5 bg-violet-600 hover:bg-violet-500 rounded-xl font-medium"><Timer className="w-5 h-5" />Start Focus</Link>
          </div>
        </div>

        {topTask && (
          <div className="bg-gradient-to-r from-violet-500/20 to-purple-500/20 border border-violet-500/30 rounded-2xl p-6">
            <div className="flex items-center gap-2 mb-2"><Sparkles className="w-4 h-4 text-violet-400" /><span className="text-sm font-medium text-violet-400">NEXT ACTION</span></div>
            <div className="flex items-center justify-between">
              <div><h2 className="text-xl font-bold">{topTask.title}</h2><p className="text-zinc-400 text-sm">AI Score: {topTask.ai_score} • {topTask.priority} priority</p></div>
              <button className="flex items-center gap-2 px-5 py-2.5 bg-violet-600 hover:bg-violet-500 rounded-xl font-medium"><Play className="w-5 h-5" />Start</button>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-6">
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2"><Flame className="w-5 h-5 text-orange-400" />Focus Timer</h2>
            <div className="text-center">
              <div className="text-6xl font-mono font-bold mb-3">{formatTime(timerSeconds)}</div>
              <div className="text-sm text-zinc-400 mb-4">{timerMode === "focus" ? "Focus Session" : "Break Time"}</div>
              <div className="flex justify-center gap-3">
                <button onClick={() => setTimerActive(!timerActive)} className={`p-3 rounded-full ${timerActive ? "bg-red-500 hover:bg-red-400" : "bg-green-500 hover:bg-green-400"}`}>
                  {timerActive ? <Pause className="w-6 h-6" /> : <Play className="w-6 h-6" />}
                </button>
                <button onClick={resetTimer} className="p-3 rounded-full bg-zinc-700 hover:bg-zinc-600"><RotateCcw className="w-6 h-6" /></button>
              </div>
            </div>
          </div>

          <div className="lg:col-span-2 bg-zinc-900/50 border border-zinc-800 rounded-2xl p-6">
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2"><Target className="w-5 h-5 text-violet-400" />AI Prioritized Tasks</h2>
            <div className="space-y-2 max-h-[300px] overflow-y-auto">
              {tasks.slice(0, 8).map((task, i) => (
                <div key={task.id} className={`flex items-center gap-3 p-3 rounded-lg ${i === 0 ? "bg-violet-500/10 border border-violet-500/30" : "bg-zinc-800/50 hover:bg-zinc-800"}`}>
                  <div className="w-6 text-center text-sm text-zinc-500">#{i + 1}</div>
                  <Circle className={`w-5 h-5 shrink-0 ${task.priority === "critical" ? "text-red-400" : task.priority === "high" ? "text-orange-400" : task.priority === "medium" ? "text-yellow-400" : "text-zinc-400"}`} />
                  <span className="flex-1 truncate">{task.title}</span>
                  <div className="text-xs text-zinc-500 bg-zinc-800 px-2 py-1 rounded">Score: {task.ai_score}</div>
                </div>
              ))}
              {tasks.length === 0 && <div className="text-center py-8 text-zinc-500"><CheckCircle2 className="w-12 h-12 mx-auto mb-2 opacity-30" /><p>All tasks completed!</p></div>}
            </div>
          </div>
        </div>

        <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-6">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2"><Target className="w-5 h-5 text-blue-400" />Smart Task Matrix<span className="text-xs text-zinc-500 font-normal ml-2">Auto-populated by AI</span></h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4">
              <div className="text-xs font-medium text-red-400 mb-2 flex items-center gap-1"><AlertTriangle className="w-3 h-3" /> DO FIRST</div>
              <div className="space-y-1">{doFirst.slice(0, 3).map((t) => <div key={t.id} className="text-sm truncate">{t.title}</div>)}{doFirst.length === 0 && <div className="text-xs text-zinc-500">None</div>}</div>
            </div>
            <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-4">
              <div className="text-xs font-medium text-blue-400 mb-2">📅 SCHEDULE</div>
              <div className="space-y-1">{schedule.slice(0, 3).map((t) => <div key={t.id} className="text-sm truncate">{t.title}</div>)}{schedule.length === 0 && <div className="text-xs text-zinc-500">None</div>}</div>
            </div>
            <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4">
              <div className="text-xs font-medium text-amber-400 mb-2">👋 DELEGATE</div>
              <div className="space-y-1">{delegate.slice(0, 3).map((t) => <div key={t.id} className="text-sm truncate">{t.title}</div>)}{delegate.length === 0 && <div className="text-xs text-zinc-500">None</div>}</div>
            </div>
            <div className="bg-zinc-500/10 border border-zinc-500/30 rounded-xl p-4">
              <div className="text-xs font-medium text-zinc-400 mb-2">🗑️ ELIMINATE</div>
              <div className="space-y-1">{eliminate.slice(0, 3).map((t) => <div key={t.id} className="text-sm truncate">{t.title}</div>)}{eliminate.length === 0 && <div className="text-xs text-zinc-500">None</div>}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
