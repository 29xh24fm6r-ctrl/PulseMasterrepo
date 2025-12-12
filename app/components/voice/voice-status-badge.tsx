// Voice Status Badge Component
// app/components/voice/voice-status-badge.tsx

"use client";

import { Mic, Activity, Zap } from "lucide-react";

const VOICE_LABELS: Record<string, string> = {
  pulse_default: "Pulse Default",
  calm_therapist: "Calm Therapist",
  hype_coach: "Hype Coach",
  jarvis_advisor: "Jarvis Advisor",
};

const COACH_LABELS: Record<string, string> = {
  sales: "Sales Coach",
  confidant: "Confidant Coach",
  executive: "Executive Coach",
  warrior: "Warrior Coach",
  negotiation: "Negotiation Coach",
  emotional: "Emotional Coach",
  strategy: "Strategy Coach",
};

export interface VoiceStatusBadgeProps {
  coachId: string;
  profile: {
    voiceId: string;
    speed: number;
    energy: number;
    warmth: number;
    temporary: boolean;
    emotion?: string | null;
    reason?: string;
  } | null;
  className?: string;
}

export function VoiceStatusBadge({
  coachId,
  profile,
  className = "",
}: VoiceStatusBadgeProps) {
  if (!profile) {
    return (
      <div className={`text-xs flex items-center gap-1 px-2 py-1 rounded-md border bg-zinc-800 border-zinc-700 text-zinc-400 ${className}`}>
        <Mic className="w-3 h-3" />
        Loading voice...
      </div>
    );
  }

  const voiceLabel = VOICE_LABELS[profile.voiceId] || profile.voiceId;
  const coachLabel = COACH_LABELS[coachId] || coachId;

  const tooltipContent = (
    <div className="space-y-1 text-xs">
      <div className="font-semibold">Voice: {voiceLabel}</div>
      <div>Coach: {coachLabel}</div>
      {profile.emotion && (
        <div className="capitalize">Emotion: {profile.emotion}</div>
      )}
      {profile.temporary && (
        <div className="flex items-center gap-1 text-amber-400">
          <Zap className="w-3 h-3" />
          Adaptive override active
        </div>
      )}
      {profile.reason && <div className="text-zinc-400">{profile.reason}</div>}
      <div className="text-zinc-500 pt-1 border-t border-zinc-700">
        Speed: {profile.speed.toFixed(2)}x · Energy: {profile.energy.toFixed(2)} · Warmth: {profile.warmth.toFixed(2)}
      </div>
    </div>
  );

  return (
    <div className="group relative">
      <div
        className={`text-xs flex items-center gap-1 px-2 py-1 rounded-md border ${
          profile.temporary
            ? "bg-violet-600/20 border-violet-500/50 text-violet-300"
            : "bg-zinc-800 border-zinc-700 text-zinc-300"
        } ${className}`}
      >
        <Mic className="w-3 h-3" />
        <span>{voiceLabel}</span>
        {profile.temporary && (
          <Zap className="w-3 h-3 text-amber-400" />
        )}
        {profile.emotion && (
          <>
            <span className="mx-1">·</span>
            <Activity className="w-3 h-3" />
            <span className="capitalize">{profile.emotion}</span>
          </>
        )}
      </div>
      <div className="absolute bottom-full right-0 mb-2 hidden group-hover:block z-50">
        <div className="bg-zinc-900 border border-zinc-700 rounded-lg p-3 shadow-xl max-w-xs text-xs space-y-1">
          {tooltipContent}
        </div>
      </div>
    </div>
  );
}

