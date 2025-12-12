// Voice OS Audio Cues
// lib/voice-os/audio-cues.ts

import { AudioCue } from "./types";

/**
 * Generate audio cue tone
 */
export function generateAudioCue(cue: AudioCue): void {
  const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();

  const oscillator = audioContext.createOscillator();
  const gainNode = audioContext.createGain();

  oscillator.connect(gainNode);
  gainNode.connect(audioContext.destination);

  // Configure based on cue type
  switch (cue.type) {
    case "thinking":
      oscillator.frequency.value = cue.frequency || 200;
      oscillator.type = "sine";
      gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + cue.duration / 1000);
      break;

    case "ready":
      oscillator.frequency.value = cue.frequency || 400;
      oscillator.type = "sine";
      gainNode.gain.setValueAtTime(0.2, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.1);
      break;

    case "butler_suggestion":
      oscillator.frequency.value = cue.frequency || 600;
      oscillator.type = "sine";
      gainNode.gain.setValueAtTime(0.15, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.2);
      break;

    case "xp_gain":
      oscillator.frequency.value = cue.frequency || 800;
      oscillator.type = "triangle";
      gainNode.gain.setValueAtTime(0.2, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.15);
      break;

    case "relationship_touch":
      oscillator.frequency.value = cue.frequency || 500;
      oscillator.type = "sine";
      gainNode.gain.setValueAtTime(0.15, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.2);
      break;

    case "error":
      oscillator.frequency.value = cue.frequency || 300;
      oscillator.type = "sawtooth";
      gainNode.gain.setValueAtTime(0.2, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);
      break;
  }

  oscillator.start(audioContext.currentTime);
  oscillator.stop(audioContext.currentTime + cue.duration / 1000);
}

/**
 * Predefined audio cues
 */
export const audioCues: Record<AudioCue["type"], AudioCue> = {
  thinking: {
    type: "thinking",
    duration: 500,
    frequency: 200,
  },
  ready: {
    type: "ready",
    duration: 100,
    frequency: 400,
  },
  butler_suggestion: {
    type: "butler_suggestion",
    duration: 200,
    frequency: 600,
  },
  xp_gain: {
    type: "xp_gain",
    duration: 150,
    frequency: 800,
  },
  relationship_touch: {
    type: "relationship_touch",
    duration: 200,
    frequency: 500,
  },
  error: {
    type: "error",
    duration: 300,
    frequency: 300,
  },
};



