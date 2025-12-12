-- Voice Profiles & User Voice Settings Migration
-- Allows users to choose Pulse's speaking voice (Jarvis, Calm, Hype, etc.)

-- Voice profiles available system-wide
create table if not exists public.voice_profiles (
  id uuid primary key default gen_random_uuid(),
  key text not null unique,               -- e.g., 'pulse_default', 'jarvis_advisor'
  display_name text not null,            -- e.g., 'Pulse Default', 'Jarvis-Style Advisor'
  description text,                      -- short UX description
  provider text not null,                -- 'elevenlabs', 'openai', 'other'
  provider_voice_id text not null,       -- e.g., ElevenLabs voice id
  style_preset text,                     -- optional: style/tone param for provider
  language_code text default 'en-US',
  gender text,                           -- 'male' | 'female' | 'neutral' | null
  is_active boolean not null default true,
  sort_order int not null default 100,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists voice_profiles_active_idx
  on public.voice_profiles (is_active, sort_order);

-- Per-user voice settings
create table if not exists public.user_voice_settings (
  user_id uuid not null references auth.users(id) on delete cascade,
  active_voice_key text references public.voice_profiles(key),
  speaking_rate numeric default 1.0,     -- 1.0 = normal
  pitch_adjust numeric default 0.0,      -- semitones, optional
  last_updated timestamptz not null default now(),
  primary key (user_id)
);

create index if not exists user_voice_settings_user_idx
  on public.user_voice_settings (user_id);

-- Helpful defaults: assign default voice by key
-- NOTE: Replace REPLACE_WITH_* with actual ElevenLabs voice IDs
insert into public.voice_profiles (key, display_name, description, provider, provider_voice_id, sort_order)
values
  ('pulse_default', 'Pulse Default', 'Balanced, warm, everyday assistant voice.', 'elevenlabs', 'REPLACE_WITH_DEFAULT_VOICE_ID', 10),
  ('jarvis_advisor', 'Jarvis-Style Advisor', 'Crisp, precise, strategic British-advisor tone.', 'elevenlabs', 'REPLACE_WITH_JARVIS-LIKE_VOICE_ID', 20),
  ('calm_therapist', 'Calm Therapist', 'Soft, slow, emotionally grounding voice.', 'elevenlabs', 'REPLACE_WITH_CALM_VOICE_ID', 30),
  ('hype_coach', 'Hype Coach', 'High-energy motivational coach voice.', 'elevenlabs', 'REPLACE_WITH_HYPE_VOICE_ID', 40)
on conflict (key) do nothing;

