"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useAuth } from "@clerk/nextjs";
import { Heart, Sun, Cloud, CloudRain, Smile, Zap, Battery, TrendingUp, TrendingDown, AlertTriangle, Loader2, Sparkles, ArrowRight, Activity, ChevronRight } from "lucide-react";

interface EmotionEntry { id: string; emotion: string; valence: number; intensity: number; created_at: string; }

const emotionConfig: Record<string, { icon: string; color: string }> = {
  happy: { icon: "😊", color: "bg-yellow-500" }, sad: { icon: "😢", color: "bg-blue-500" }, anxious: { icon: "😰", color: "bg-purple-500" },
  calm: { icon: "😌", color: "bg-green-500" }, angry: { icon: "😠", color: "bg-red-500" }, excited: { icon: "🤩", color: "bg-orange-500" },
  tired: { icon: "😴", color: "bg-zinc-500" }, stressed: { icon: "😫", color: "bg-pink-500" }, neutral: { icon: "😐", color: "bg-zinc-400" },
  grateful: { icon: "🙏", color: "bg-amber-500" }, focused: { icon: "🎯", color: "bg-cyan-500" }, overwhelmed: { icon: "🌊", color: "bg-indigo-500" },
};

const quickEmotions = ["happy", "calm", "focused", "tired", "stressed", "anxious", "grateful", "overwhelmed", "neutral"];

export default function WellnessDashboard() {
  const { userId, isLoaded } = useAuth();
  const [loading, setLoading] = useState(true);
  const [emotions, setEmotions] = useState<EmotionEntry[]>([]);
  const [moodForecast, setMoodForecast] = useState<"sunny" | "cloudy" | "stormy">("cloudy");
  const [energyLevel, setEnergyLevel] = useState(0.5);
  const [stressLevel, setStressLevel] = useState(0.3);
  const [recoveryTip, setRecoveryTip] = useState("");
  const [weeklyTrend, setWeeklyTrend] = useState<"up" | "down" | "stable">("stable");
  const [currentMood, setCurrentMood] = useState("neutral");

  useEffect(() => { if (!isLoaded || !userId) return; fetchData(); }, [userId, isLoaded]);

  async function fetchData() {
    try {
      const res = await fetch("/api/emotion?limit=30");
      if (res.ok) {
        const data = await res.json();
        const states = data.states || [];
        setEmotions(states);
        if (states.length > 0) {
          setCurrentMood(states[0].emotion || "neutral");
          const avgValence = states.slice(0, 7).reduce((s: number, e: EmotionEntry) => s + (e.valence || 0), 0) / Math.min(7, states.length);
          const avgIntensity = states.slice(0, 7).reduce((s: number, e: EmotionEntry) => s + (e.intensity || 0.5), 0) / Math.min(7, states.length);
          setEnergyLevel(avgIntensity);
          const stress = Math.max(0, (0.5 - avgValence) * avgIntensity * 2);
          setStressLevel(Math.min(1, stress));
          if (avgValence > 0.3) setMoodForecast("sunny");
          else if (avgValence < -0.2) setMoodForecast("stormy");
          else setMoodForecast("cloudy");
          if (stress > 0.6) setRecoveryTip("High stress detected. Consider a 5-minute breathing exercise or short walk.");
          else if (avgIntensity < 0.3) setRecoveryTip("Energy is low. A quick stretch or some water might help.");
          else if (avgValence < 0) setRecoveryTip("Mood has been challenging. Try connecting with someone or journaling.");
          else setRecoveryTip("You're doing well! Keep up the positive momentum.");
          if (states.length >= 4) {
            const recent = states.slice(0, 2).reduce((s: number, e: EmotionEntry) => s + (e.valence || 0), 0) / 2;
            const older = states.slice(2, 4).reduce((s: number, e: EmotionEntry) => s + (e.valence || 0), 0) / 2;
            if (recent > older + 0.1) setWeeklyTrend("up");
            else if (recent < older - 0.1) setWeeklyTrend("down");
            else setWeeklyTrend("stable");
          }
        }
      }
    } catch (error) { console.error("Failed to fetch data:", error); }
    finally { setLoading(false); }
  }

  async function logEmotion(emotion: string) {
    try {
      const valence = ["happy", "calm", "excited", "grateful", "focused"].includes(emotion) ? 0.7 : ["sad", "angry", "stressed", "anxious", "overwhelmed"].includes(emotion) ? -0.5 : 0;
      await fetch("/api/emotion", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ emotion, valence, intensity: 0.6 }) });
      fetchData();
    } catch (error) { console.error("Failed to log emotion:", error); }
  }

  if (!isLoaded || loading) return <div className="min-h-screen bg-zinc-950 text-white flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-violet-500" /></div>;

  const moodIcon = emotionConfig[currentMood]?.icon || "😐";

  return (
    <div className="min-h-screen bg-gradient-to-br from-zinc-950 via-zinc-900 to-zinc-950 text-white p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-gradient-to-br from-pink-500/20 to-rose-500/20 rounded-xl"><Heart className="w-8 h-8 text-pink-400" /></div>
            <div><h1 className="text-3xl font-bold">Emotional Climate</h1><p className="text-zinc-400">Your wellbeing at a glance</p></div>
          </div>
          <div className="flex items-center gap-2">
            {weeklyTrend === "up" && <TrendingUp className="w-5 h-5 text-green-400" />}
            {weeklyTrend === "down" && <TrendingDown className="w-5 h-5 text-red-400" />}
            <span className="text-sm text-zinc-400">{weeklyTrend === "up" ? "Improving" : weeklyTrend === "down" ? "Declining" : "Stable"}</span>
          </div>
        </div>

        {stressLevel > 0.5 && (
          <div className="bg-gradient-to-r from-pink-500/20 to-rose-500/20 border border-pink-500/30 rounded-2xl p-5">
            <div className="flex items-center gap-2 mb-2"><Sparkles className="w-4 h-4 text-pink-400" /><span className="text-sm font-medium text-pink-400">RECOMMENDED ACTION</span></div>
            <div className="flex items-center justify-between">
              <div><h2 className="text-xl font-bold">Take a wellness break</h2><p className="text-zinc-400 text-sm">Your stress levels are elevated. A short break could help.</p></div>
              <Link href="/morning" className="flex items-center gap-2 px-5 py-2.5 bg-pink-600 hover:bg-pink-500 rounded-xl font-medium">Start Break<ArrowRight className="w-4 h-4" /></Link>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="md:col-span-1 bg-zinc-900/50 border border-zinc-800 rounded-2xl p-6 text-center">
            <div className="text-6xl mb-3">{moodIcon}</div>
            <h3 className="text-xl font-bold mb-1 capitalize">{currentMood}</h3>
            <p className="text-zinc-400 text-sm">Current mood</p>
          </div>
          <div className="md:col-span-2 bg-zinc-900/50 border border-zinc-800 rounded-2xl p-6">
            <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
              {moodForecast === "sunny" && <Sun className="w-5 h-5 text-yellow-400" />}
              {moodForecast === "cloudy" && <Cloud className="w-5 h-5 text-zinc-400" />}
              {moodForecast === "stormy" && <CloudRain className="w-5 h-5 text-blue-400" />}
              Mood Forecast
            </h3>
            <div className={`text-2xl font-bold mb-2 ${moodForecast === "sunny" ? "text-yellow-400" : moodForecast === "stormy" ? "text-blue-400" : "text-zinc-300"}`}>
              {moodForecast === "sunny" && "☀️ Positive outlook"}{moodForecast === "cloudy" && "⛅ Mixed conditions"}{moodForecast === "stormy" && "🌧️ Challenging period"}
            </div>
            <p className="text-zinc-400">{recoveryTip}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-6">
            <h3 className="text-lg font-bold mb-4 flex items-center gap-2"><Battery className="w-5 h-5 text-green-400" />Energy Level</h3>
            <div className="space-y-3">
              <div className="flex justify-between items-center"><span className="text-3xl font-bold">{(energyLevel * 100).toFixed(0)}%</span>
                <span className={`text-sm ${energyLevel > 0.6 ? "text-green-400" : energyLevel > 0.3 ? "text-amber-400" : "text-red-400"}`}>{energyLevel > 0.6 ? "High" : energyLevel > 0.3 ? "Moderate" : "Low"}</span>
              </div>
              <div className="h-4 bg-zinc-700 rounded-full overflow-hidden">
                <div className={`h-full rounded-full ${energyLevel > 0.6 ? "bg-green-500" : energyLevel > 0.3 ? "bg-amber-500" : "bg-red-500"}`} style={{ width: `${energyLevel * 100}%` }} />
              </div>
            </div>
          </div>

          <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-6">
            <h3 className="text-lg font-bold mb-4 flex items-center gap-2"><Activity className="w-5 h-5 text-pink-400" />Stress Level</h3>
            <div className="space-y-3">
              <div className="flex justify-between items-center"><span className="text-3xl font-bold">{(stressLevel * 100).toFixed(0)}%</span>
                <span className={`text-sm ${stressLevel < 0.3 ? "text-green-400" : stressLevel < 0.6 ? "text-amber-400" : "text-red-400"}`}>{stressLevel < 0.3 ? "Low" : stressLevel < 0.6 ? "Moderate" : "High"}</span>
              </div>
              <div className="h-4 bg-zinc-700 rounded-full overflow-hidden">
                <div className={`h-full rounded-full ${stressLevel < 0.3 ? "bg-green-500" : stressLevel < 0.6 ? "bg-amber-500" : "bg-red-500"}`} style={{ width: `${stressLevel * 100}%` }} />
              </div>
              {stressLevel > 0.6 && <div className="flex items-center gap-2 text-sm text-amber-400"><AlertTriangle className="w-4 h-4" />Consider taking a break</div>}
            </div>
          </div>
        </div>

        <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-6">
          <div className="flex items-center justify-between mb-4"><h3 className="text-lg font-bold">Emotion Timeline</h3><Link href="/emotions" className="text-sm text-violet-400 flex items-center gap-1">Full history <ChevronRight className="w-4 h-4" /></Link></div>
          <div className="flex items-end gap-1 h-32">
            {emotions.slice(0, 30).reverse().map((e, i) => {
              const height = 30 + (e.valence + 1) * 35;
              const config = emotionConfig[e.emotion] || emotionConfig.neutral;
              return <div key={e.id || i} className={`flex-1 rounded-t ${config.color} opacity-70 hover:opacity-100 cursor-pointer`} style={{ height: `${height}%` }} title={`${e.emotion}`} />;
            })}
            {emotions.length === 0 && <div className="flex-1 flex items-center justify-center text-zinc-500">No emotion data yet</div>}
          </div>
        </div>

        <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-6">
          <h3 className="text-lg font-bold mb-4 flex items-center gap-2"><Smile className="w-5 h-5 text-yellow-400" />Quick Emotion Log</h3>
          <div className="grid grid-cols-3 md:grid-cols-9 gap-3">
            {quickEmotions.map((emotion) => {
              const config = emotionConfig[emotion];
              return <button key={emotion} onClick={() => logEmotion(emotion)} className="flex flex-col items-center gap-2 p-3 bg-zinc-800/50 hover:bg-zinc-700 rounded-xl"><span className="text-2xl">{config?.icon || "😐"}</span><span className="text-xs capitalize">{emotion}</span></button>;
            })}
          </div>
        </div>

        <div className="bg-gradient-to-r from-green-500/10 to-emerald-500/10 border border-green-500/20 rounded-2xl p-6">
          <h3 className="text-lg font-bold mb-3 flex items-center gap-2"><Zap className="w-5 h-5 text-green-400" />Recovery Recommendations</h3>
          <p className="text-zinc-300 mb-4">{recoveryTip}</p>
          <div className="flex flex-wrap gap-2">
            <Link href="/morning" className="px-4 py-2 bg-green-600/20 border border-green-500/30 rounded-lg text-sm hover:bg-green-600/30">🌅 Morning Routine</Link>
            <Link href="/journal" className="px-4 py-2 bg-green-600/20 border border-green-500/30 rounded-lg text-sm hover:bg-green-600/30">📓 Journal</Link>
            <Link href="/shutdown" className="px-4 py-2 bg-green-600/20 border border-green-500/30 rounded-lg text-sm hover:bg-green-600/30">🌙 Shutdown Routine</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
