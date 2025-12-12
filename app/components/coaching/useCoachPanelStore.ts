// Coach Panel Store
// app/components/coaching/useCoachPanelStore.ts

"use client";

import { create } from "zustand";
import { CoachKey } from "@/lib/coaching/catalog";

interface CoachPanelState {
  isOpen: boolean;
  coachKey: CoachKey | null;
  origin?: string;
  sessionId?: string;
  initialUserMessage?: string;
  openCoach: (args: {
    coachKey: CoachKey;
    origin?: string;
    initialUserMessage?: string;
  }) => void;
  closeCoach: () => void;
  setSessionId: (id: string) => void;
}

export const useCoachPanelStore = create<CoachPanelState>((set) => ({
  isOpen: false,
  coachKey: null,
  origin: undefined,
  sessionId: undefined,
  initialUserMessage: undefined,
  openCoach: (args) =>
    set({
      isOpen: true,
      coachKey: args.coachKey,
      origin: args.origin,
      initialUserMessage: args.initialUserMessage,
      sessionId: undefined, // Will be set after session creation
    }),
  closeCoach: () =>
    set({
      isOpen: false,
      coachKey: null,
      origin: undefined,
      sessionId: undefined,
      initialUserMessage: undefined,
    }),
  setSessionId: (id: string) => set({ sessionId: id }),
}));




