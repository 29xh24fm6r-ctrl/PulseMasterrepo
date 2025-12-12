-- ECC v4: Audio Capture Support
-- supabase/migrations/comms_audio_v4.sql

-- Add audio mode to comm_channels
alter table public.comm_channels
  add column if not exists audio_mode boolean default false;

-- Add audio URL to comm_messages
alter table public.comm_messages
  add column if not exists audio_url text;

-- Add audio capture settings
create table if not exists public.user_audio_settings (
  user_id uuid primary key references auth.users(id) on delete cascade,
  audio_capture_enabled boolean default false,
  require_manual_start boolean default true,
  auto_upload_meetings boolean default false,
  delete_audio_after_transcription boolean default false,
  mask_speaker_names boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

