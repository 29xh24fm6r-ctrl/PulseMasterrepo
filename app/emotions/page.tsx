"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@clerk/nextjs";
import { Heart, TrendingUp, Smile, Frown, Meh, Zap, Moon, Sun, Coffee, Activity } from "lucide-react";

interface EmotionState {
  detected_emotion: string;
  intensity: number;
  valence: number;
  occurred_at: string;
}

interface EmotionTrend {
  dominant_emotion: string;
  average_intensity: number;
  average_valence: number;
  emotion_distribution: Record<string, number>;
}

const EMOTION_COLORS: Record<string, string> = {
  happy: "bg-yellow-500", excited: "bg-orange-500", motivated: "bg-green-500",
  calm: "bg-blue-500", neutral: "bg-gray-500", stressed: "bg-red-500",
  anxious: "bg-purple-500", sad: "bg-indigo-500", tired: "bg-gray-600",
  frustrated: "bg-red-600", confident: "bg-emerald-500", hopeful: "bg-cyan-500"
};

const EMOTION_ICONS: Record<string, any> = {
  happy: Smile, excited: Zap, calm: Moon, stressed: Activity,
  sad: Frown, neutral: Meh, tired: Coffee, motivated: TrendingUp
};

export default function EmotionsPage() {
  const { userId } = useAuth();
  const [currentState, setCurrentState] = useState<EmotionState | null>(null);
  const [recentStates, setRecentStates] = useState<EmotionState[]>([]);
  const [trend, setTrend] = useState<EmotionTrend | null>(null);
  const [loading, setLoading] = useState(true);

  // Check-in state
  const [checkinEmotion, setCheckinEmotion] = useState("");
  const [checkinIntensity, setCheckinIntensity] = useState(5);

  useEffect(() => {
    loadEmotionData();
  }, [userId]);

  const loadEmotionData = async () => {
    try {
      const res = await fetch("/api/emotion");
      const data = await res.json();
      if (data.current) setCurrentState(data.current);
      if (data.recent) setRecentStates(data.recent);
      if (data.trend) setTrend(data.trend);
    } catch (error) {
      console.error("Failed to load emotion data:", error);
    }
    setLoading(false);
  };

  const submitCheckin = async () => {
    if (!checkinEmotion) return;
    try {
      await fetch("/api/emotion", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "checkin",
          emotion: checkinEmotion,
          intensity: checkinIntensity / 10
        })
      });
      loadEmotionData();
      setCheckinEmotion("");
      setCheckinIntensity(5);
    } catch (error) {
      console.error("Checkin failed:", error);
    }
  };

  const getEmotionIcon = (emotion: string) => {
    const Icon = EMOTION_ICONS[emotion] || Heart;
    return <Icon className="w-5 h-5" />;
  };

  const emotions = ["happy", "calm", "motivated", "excited", "neutral", "tired", "stressed", "anxious", "sad", "frustrated"];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-white p-6">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <h1 className="text-4xl font-bold flex items-center gap-3">
            <Heart className="w-10 h-10 text-pink-400" />
            Emotion Dashboard
          </h1>
          <p className="text-slate-400 mt-2">Track and understand your emotional patterns</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Current State */}
          <div className="bg-slate-800/50 rounded-2xl p-6 border border-slate-700/50">
            <h3 className="font-semibold mb-4 flex items-center gap-2">
              <Sun className="w-5 h-5 text-yellow-400" />
              Current State
            </h3>
            {currentState ? (
              <div className="text-center">
                <div className={`w-20 h-20 ${EMOTION_COLORS[currentState.detected_emotion] || "bg-gray-500"} rounded-full flex items-center justify-center mx-auto mb-4`}>
                  {getEmotionIcon(currentState.detected_emotion)}
                </div>
                <p className="text-2xl font-bold capitalize">{currentState.detected_emotion}</p>
                <div className="mt-4 grid grid-cols-2 gap-4 text-sm">
                  <div className="bg-slate-900/50 rounded-lg p-3">
                    <p className="text-slate-500">Intensity</p>
                    <p className="font-bold">{Math.round(currentState.intensity * 100)}%</p>
                  </div>
                  <div className="bg-slate-900/50 rounded-lg p-3">
                    <p className="text-slate-500">Valence</p>
                    <p className="font-bold">{currentState.valence > 0 ? "+" : ""}{currentState.valence?.toFixed(1)}</p>
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-slate-500 text-center py-8">No recent emotion data</p>
            )}
          </div>

          {/* Quick Check-in */}
          <div className="bg-slate-800/50 rounded-2xl p-6 border border-slate-700/50">
            <h3 className="font-semibold mb-4">How are you feeling?</h3>
            <div className="grid grid-cols-5 gap-2 mb-4">
              {emotions.map((emotion) => (
                <button
                  key={emotion}
                  onClick={() => setCheckinEmotion(emotion)}
                  className={`p-2 rounded-lg text-xs capitalize transition-all ${
                    checkinEmotion === emotion
                      ? `${EMOTION_COLORS[emotion]} text-white`
                      : "bg-slate-700/50 hover:bg-slate-600"
                  }`}
                >
                  {emotion}
                </button>
              ))}
            </div>
            <div className="mb-4">
              <label className="text-sm text-slate-400 block mb-2">Intensity: {checkinIntensity}/10</label>
              <input
                type="range"
                min="1"
                max="10"
                value={checkinIntensity}
                onChange={(e) => setCheckinIntensity(Number(e.target.value))}
                className="w-full"
              />
            </div>
            <button
              onClick={submitCheckin}
              disabled={!checkinEmotion}
              className="w-full py-2 bg-pink-500 rounded-lg font-semibold disabled:opacity-50"
            >
              Log Emotion
            </button>
          </div>

          {/* Trend Summary */}
          <div className="bg-slate-800/50 rounded-2xl p-6 border border-slate-700/50">
            <h3 className="font-semibold mb-4 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-green-400" />
              Weekly Trend
            </h3>
            {trend ? (
              <div>
                <div className="text-center mb-4">
                  <p className="text-slate-500 text-sm">Dominant Emotion</p>
                  <p className="text-xl font-bold capitalize">{trend.dominant_emotion}</p>
                </div>
                <div className="space-y-3">
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-slate-400">Avg Intensity</span>
                      <span>{Math.round(trend.average_intensity * 100)}%</span>
                    </div>
                    <div className="h-2 bg-slate-700 rounded-full">
                      <div
                        className="h-full bg-pink-500 rounded-full"
                        style={{ width: `${trend.average_intensity * 100}%` }}
                      />
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-slate-400">Avg Valence</span>
                      <span>{trend.average_valence > 0 ? "+" : ""}{trend.average_valence?.toFixed(2)}</span>
                    </div>
                    <div className="h-2 bg-slate-700 rounded-full">
                      <div
                        className="h-full bg-green-500 rounded-full"
                        style={{ width: `${(trend.average_valence + 1) * 50}%` }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-slate-500 text-center py-8">Not enough data for trends</p>
            )}
          </div>
        </div>

        {/* Recent History */}
        <div className="mt-6 bg-slate-800/50 rounded-2xl p-6 border border-slate-700/50">
          <h3 className="font-semibold mb-4">Recent Emotions</h3>
          {recentStates.length > 0 ? (
            <div className="flex gap-3 overflow-x-auto pb-2">
              {recentStates.slice(0, 10).map((state, i) => (
                <div key={i} className="flex-shrink-0 bg-slate-900/50 rounded-lg p-3 min-w-[120px]">
                  <div className={`w-8 h-8 ${EMOTION_COLORS[state.detected_emotion] || "bg-gray-500"} rounded-full flex items-center justify-center mb-2`}>
                    {getEmotionIcon(state.detected_emotion)}
                  </div>
                  <p className="font-medium capitalize text-sm">{state.detected_emotion}</p>
                  <p className="text-xs text-slate-500">{new Date(state.occurred_at).toLocaleTimeString()}</p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-slate-500">No recent emotions logged</p>
          )}
        </div>
      </div>
    </div>
  );
}