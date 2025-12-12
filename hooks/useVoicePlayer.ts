// Voice Player Hook
// hooks/useVoicePlayer.ts

"use client";

import { useState, useRef } from "react";

export interface VoiceStyle {
  speed: number;
  energy: number;
  warmth: number;
}

export interface VoiceProfile {
  voiceId: string;
  speed: number;
  energy: number;
  warmth: number;
  temporary: boolean;
  emotion?: string | null;
  reason?: string;
}

export function useVoicePlayer() {
  const [profile, setProfile] = useState<VoiceProfile | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  async function speakText(
    coachId: string,
    replyText: string,
    userInput?: string
  ) {
    try {
      setIsLoading(true);

      // 1. Get dynamic voice profile based on coach and emotion
      const selectRes = await fetch("/api/voice/select", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ coachId, userInput }),
      });

      if (!selectRes.ok) {
        throw new Error("Failed to select voice profile");
      }

      const voiceSettings: VoiceProfile = await selectRes.json();
      setProfile(voiceSettings);

      // 2. Get the actual voice profile from database to get provider_voice_id
      const settingsRes = await fetch("/api/voice/settings");
      const settingsData = await settingsRes.json();
      const voiceProfile = settingsData.voices?.find(
        (v: any) => v.key === voiceSettings.voiceId
      );

      if (!voiceProfile) {
        throw new Error(`Voice profile ${voiceSettings.voiceId} not found`);
      }

      // 3. Generate TTS with style parameters
      const ttsRes = await fetch("/api/voice/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: replyText,
          voiceId: voiceProfile.provider_voice_id,
          style: {
            speed: voiceSettings.speed,
            energy: voiceSettings.energy,
            warmth: voiceSettings.warmth,
          },
        }),
      });

      if (!ttsRes.ok) {
        throw new Error("Failed to generate speech");
      }

      // 4. Play audio
      const blob = await ttsRes.blob();
      const url = URL.createObjectURL(blob);

      // Stop any currently playing audio
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }

      const player = new Audio(url);
      audioRef.current = player;

      player.onplay = () => setIsPlaying(true);
      player.onended = () => {
        setIsPlaying(false);
        URL.revokeObjectURL(url);
        audioRef.current = null;
      };
      player.onerror = () => {
        setIsPlaying(false);
        URL.revokeObjectURL(url);
        audioRef.current = null;
      };

      await player.play();
    } catch (err) {
      console.error("[useVoicePlayer] Error:", err);
      setIsLoading(false);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }

  function stop() {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      setIsPlaying(false);
      audioRef.current = null;
    }
  }

  return {
    speakText,
    stop,
    profile,
    isPlaying,
    isLoading,
  };
}

