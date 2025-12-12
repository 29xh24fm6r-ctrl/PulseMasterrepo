// Voice-Only Pulse OS Types
// lib/voice-os/types.ts

export interface VoiceSession {
  id: string;
  userId: string;
  startedAt: string;
  lastActivityAt: string;
  state: "greeting" | "briefing" | "listening" | "processing" | "responding" | "closing";
  context: VoiceContext;
  interruptions: number;
}

export interface VoiceContext {
  currentDomain?: string;
  currentTask?: string;
  currentRelationship?: string;
  conversationHistory: Array<{
    role: "user" | "pulse";
    content: string;
    timestamp: string;
  }>;
}

export interface VoiceBriefing {
  emotion: string;
  energy: number;
  priorities: string[];
  opportunities: string[];
  risks: string[];
  relationshipTouches: string[];
  suggestedActions: string[];
}

export interface AudioCue {
  type: "thinking" | "ready" | "butler_suggestion" | "xp_gain" | "relationship_touch" | "error";
  duration: number; // milliseconds
  frequency?: number; // Hz for tones
}



