// Voice Autonomy State Store
// app/state/voice-autonomy-store.ts

import { create } from "zustand";
import { VoiceAutonomyState, VoiceIntervention, VoicePersonaKey } from "@/lib/voice/autonomy/types";

interface VoiceAutonomyStore extends VoiceAutonomyState {
  setLiveMode: (enabled: boolean) => void;
  setPersonaPreference: (persona: VoicePersonaKey) => void;
  recordIntervention: (intervention: VoiceIntervention) => void;
  clearCooldown: (trigger: string) => void;
  getCooldownRemaining: (trigger: string) => number; // Returns seconds remaining
}

export const useVoiceAutonomyStore = create<VoiceAutonomyStore>((set, get) => ({
  isLiveModeEnabled: false,
  lastIntervention: undefined,
  lastInterventionTime: undefined,
  personaPreference: undefined,
  cooldownTimers: {} as Record<string, number>,

  setLiveMode: (enabled: boolean) => {
    set({ isLiveModeEnabled: enabled });
  },

  setPersonaPreference: (persona: VoicePersonaKey) => {
    set({ personaPreference: persona });
  },

  recordIntervention: (intervention: VoiceIntervention) => {
    set({
      lastIntervention: intervention,
      lastInterventionTime: intervention.timestamp,
      cooldownTimers: {
        ...get().cooldownTimers,
        [intervention.trigger]: new Date(intervention.timestamp).getTime(),
      },
    });
  },

  clearCooldown: (trigger: string) => {
    const timers = { ...get().cooldownTimers };
    delete timers[trigger];
    set({ cooldownTimers: timers });
  },

  getCooldownRemaining: (trigger: string) => {
    const timers = get().cooldownTimers;
    const lastTime = timers[trigger];
    if (!lastTime) return 0;

    const triggerConfig = require("@/lib/voice/autonomy/voice-triggers").VOICE_AUTONOMY_TRIGGERS.find(
      (t: any) => t.id === trigger
    );
    const cooldownMs = (triggerConfig?.cooldownMinutes || 60) * 60 * 1000;
    const remaining = cooldownMs - (Date.now() - lastTime);

    return Math.max(0, Math.floor(remaining / 1000));
  },
}));



