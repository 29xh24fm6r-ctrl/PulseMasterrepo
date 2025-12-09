"use client";

import { Heart, TrendingUp, TrendingDown } from "lucide-react";

interface EmotionState {
  detected_emotion: string;
  intensity: number;
  valence: number;
  occurred_at: string;
}

interface EmotionProfile {
  dominant_emotions: string[];
  average_valence: number;
  emotional_volatility: number;
  weekly_trend: string;
}

interface Props {
  recentStates: EmotionState[];
  profile: EmotionProfile | null;
}

const EMOTION_COLORS: Record<string, string> = {
  happy: "bg-yellow-500", excited: "bg-orange-500", motivated: "bg-green-500",
  calm: "bg-blue-500", neutral: "bg-zinc-500", stressed: "bg-red-500",
  anxious: "bg-purple-500", sad: "bg-indigo-500", tired: "bg-zinc-600",
  frustrated: "bg-red-600", confident: "bg-emerald-500", hopeful: "bg-cyan-500"
};

export function EmotionPulse({ recentStates, profile }: Props) {
  const currentEmotion = recentStates[0];
  const trendIcon = profile?.weekly_trend === "improving" 
    ? <TrendingUp className="w-4 h-4 text-green-400" />
    : profile?.weekly_trend === "declining"
      ? <TrendingDown className="w-4 h-4 text-red-400" />
      : null;

  return (
    <div className="bg-zinc-800/50 rounded-2xl p-6 border border-zinc-700/50">
      <div className="flex items-center gap-3 mb-4">
        <div className="p-2 bg-pink-500/20 rounded-lg">
          <Heart className="w-5 h-5 text-pink-400" />
        </div>
        <h3 className="font-semibold text-lg">Emotion Pulse</h3>
        {trendIcon}
      </div>

      {currentEmotion ? (
        <>
          {/* Current emotion */}
          <div className="text-center mb-4">
            <div className={`w-16 h-16 ${EMOTION_COLORS[currentEmotion.detected_emotion] || "bg-zinc-600"} rounded-full flex items-center justify-center mx-auto mb-2`}>
              <span className="text-2xl">
                {currentEmotion.valence > 0.3 ? "😊" : currentEmotion.valence < -0.3 ? "😔" : "😐"}
              </span>
            </div>
            <p className="text-xl font-bold capitalize">{currentEmotion.detected_emotion}</p>
            <p className="text-sm text-zinc-500">
              Intensity: {Math.round(currentEmotion.intensity * 100)}%
            </p>
          </div>

          {/* Recent emotions strip */}
          <div className="flex gap-1 mb-4">
            {recentStates.slice(0, 10).map((state, i) => (
              <div
                key={i}
                className={`flex-1 h-2 rounded-full ${EMOTION_COLORS[state.detected_emotion] || "bg-zinc-600"}`}
                title={`${state.detected_emotion} at ${new Date(state.occurred_at).toLocaleTimeString()}`}
              />
            ))}
          </div>

          {/* Profile summary */}
          {profile && (
            <div className="bg-zinc-900/50 rounded-lg p-3 text-sm">
              <p className="text-zinc-400">
                Dominant: <span className="text-white">{profile.dominant_emotions?.join(", ")}</span>
              </p>
              <p className="text-zinc-400">
                Avg Valence: <span className={profile.average_valence > 0 ? "text-green-400" : "text-red-400"}>
                  {profile.average_valence > 0 ? "+" : ""}{profile.average_valence?.toFixed(2)}
                </span>
              </p>
            </div>
          )}
        </>
      ) : (
        <p className="text-zinc-500 text-center py-4">No emotion data yet. How are you feeling?</p>
      )}
    </div>
  );
}