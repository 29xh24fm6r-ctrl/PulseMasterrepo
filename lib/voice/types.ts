// Voice Types
// lib/voice/types.ts

export type VoiceProvider = 'elevenlabs' | 'openai' | 'other';

export interface VoiceProfile {
  id: string;
  key: string;
  display_name: string;
  description?: string;
  provider: VoiceProvider;
  provider_voice_id: string;
  style_preset?: string | null;
  language_code?: string | null;
  gender?: string | null;
  is_active: boolean;
  sort_order: number;
}

export interface UserVoiceSettings {
  user_id: string;
  active_voice_key: string | null;
  speaking_rate: number;
  pitch_adjust: number;
  last_updated: string;
}

