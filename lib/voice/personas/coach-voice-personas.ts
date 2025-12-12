// Coach Voice Personas
// lib/voice/personas/coach-voice-personas.ts

export interface CoachVoicePersona {
  id: string;               // "sales", "confidant", "executive", etc
  displayName: string;
  baseVoiceId: string;      // Voice profile key from voice_profiles table
  speakingStyle: {
    speed: number;          // 0.8 = slow, 1 = normal, 1.3 = hype
    energy: number;         // 0–1, used by TTS models supporting expressiveness
    warmth: number;         // 0–1 emotional tone
  };
  description: string;
}

/**
 * Coach Voice Personas
 * 
 * NOTE: baseVoiceId should match keys from lib/voices/seed.ts VOICE_ARCHETYPES
 * Available voices: hype_warrior, zen_therapist, executive_strategist, samurai_mentor, friendly_butler, analytical_guide
 */
export const COACH_VOICE_PERSONAS: CoachVoicePersona[] = [
  {
    id: "sales",
    displayName: "Sales Coach",
    baseVoiceId: "hype_warrior", // Fixed: was "hype_coach"
    speakingStyle: { speed: 1.25, energy: 0.95, warmth: 0.4 },
    description: "High energy, punchy, fast-paced motivational tone. Hype mode by default.",
  },
  {
    id: "confidant",
    displayName: "Confidant Coach",
    baseVoiceId: "zen_therapist", // Fixed: was "calm_therapist"
    speakingStyle: { speed: 0.85, energy: 0.3, warmth: 0.9 },
    description: "Soft, regulated, deeply supportive. Perfect for emotional grounding.",
  },
  {
    id: "executive",
    displayName: "Executive Function Coach",
    baseVoiceId: "executive_strategist", // Fixed: was "pulse_default"
    speakingStyle: { speed: 1.0, energy: 0.55, warmth: 0.55 },
    description: "Crisp, authoritative, balanced — like a top-tier chief of staff.",
  },
  {
    id: "warrior",
    displayName: "Warrior Coach",
    baseVoiceId: "hype_warrior", // Fixed: was "jarvis_advisor"
    speakingStyle: { speed: 1.1, energy: 0.8, warmth: 0.3 },
    description: "Commanding and decisive. Ideal for discipline and motivation.",
  },
  {
    id: "negotiation",
    displayName: "Negotiation Coach",
    baseVoiceId: "executive_strategist", // Fixed: was "jarvis_advisor"
    speakingStyle: { speed: 1.0, energy: 0.6, warmth: 0.5 },
    description: "Strategic, measured, analytical. Perfect for negotiation scenarios.",
  },
  {
    id: "emotional",
    displayName: "Emotional Coach",
    baseVoiceId: "zen_therapist", // Fixed: was "calm_therapist"
    speakingStyle: { speed: 0.9, energy: 0.4, warmth: 0.95 },
    description: "Empathetic, understanding, emotionally intelligent.",
  },
  {
    id: "strategy",
    displayName: "Strategy Coach",
    baseVoiceId: "executive_strategist", // Fixed: was "jarvis_advisor"
    speakingStyle: { speed: 1.05, energy: 0.7, warmth: 0.4 },
    description: "Thoughtful, forward-thinking, strategic planning voice.",
  },
  // Additional coaches from registry
  {
    id: "career",
    displayName: "Career Coach",
    baseVoiceId: "executive_strategist",
    speakingStyle: { speed: 1.0, energy: 0.6, warmth: 0.6 },
    description: "Strategic career guidance and professional development.",
  },
  {
    id: "philosophy",
    displayName: "Philosophy Coach",
    baseVoiceId: "samurai_mentor",
    speakingStyle: { speed: 0.85, energy: 0.35, warmth: 0.6 },
    description: "Stoic, philosophical, wisdom-focused guidance.",
  },
  {
    id: "autopilot",
    displayName: "Autopilot Coach",
    baseVoiceId: "executive_strategist",
    speakingStyle: { speed: 1.0, energy: 0.55, warmth: 0.55 },
    description: "Efficient, task-oriented assistant voice.",
  },
  {
    id: "roleplay",
    displayName: "Roleplay Coach",
    baseVoiceId: "friendly_butler", // Dynamic based on context
    speakingStyle: { speed: 1.0, energy: 0.55, warmth: 0.85 },
    description: "Adaptive voice for roleplay scenarios.",
  },
  {
    id: "general",
    displayName: "General Assistant",
    baseVoiceId: "friendly_butler",
    speakingStyle: { speed: 1.0, energy: 0.55, warmth: 0.85 },
    description: "Polite, warm, helpful everyday assistant voice.",
  },
];

/**
 * Get persona by coach ID
 */
export function getCoachPersona(coachId: string): CoachVoicePersona | null {
  return COACH_VOICE_PERSONAS.find(p => p.id === coachId) || null;
}

/**
 * Get all available personas
 */
export function getAllPersonas(): CoachVoicePersona[] {
  return COACH_VOICE_PERSONAS;
}

