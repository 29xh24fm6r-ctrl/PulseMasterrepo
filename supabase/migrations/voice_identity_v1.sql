-- Voice Identity Engine v1
-- supabase/migrations/voice_identity_v1.sql

-- Voice Profiles (linked to contacts)
create table if not exists public.voice_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  contact_id uuid references contacts(id) on delete cascade,
  contact_name text, -- fallback if no contact_id
  embedding vector(768), -- speaker embedding (requires pgvector extension)
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists voice_profiles_user_idx
  on public.voice_profiles (user_id);

create index if not exists voice_profiles_contact_idx
  on public.voice_profiles (contact_id) where contact_id is not null;

-- Unknown Speaker Profiles
create table if not exists public.voice_unknown_speakers (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  embedding vector(768),
  first_seen timestamptz default now(),
  last_seen timestamptz default now(),
  occurrence_count int default 1,
  label text -- user-assigned temporary label like "Unknown A"
);

create index if not exists voice_unknown_speakers_user_idx
  on public.voice_unknown_speakers (user_id);

-- Speaker Assignments for Messages
create table if not exists public.comm_message_speakers (
  id uuid primary key default gen_random_uuid(),
  comm_message_id uuid not null references comm_messages(id) on delete cascade,
  speaker_label text not null, -- "SPEAKER_1", "SPEAKER_2", etc.
  speaker_profile_id uuid references voice_profiles(id),
  unknown_speaker_id uuid references voice_unknown_speakers(id),
  confidence float default 0.0,
  embedding vector(768),
  transcript_segment text,
  start_time float, -- seconds
  end_time float, -- seconds
  created_at timestamptz default now()
);

create index if not exists comm_message_speakers_message_idx
  on public.comm_message_speakers (comm_message_id);

create index if not exists comm_message_speakers_profile_idx
  on public.comm_message_speakers (speaker_profile_id) where speaker_profile_id is not null;

-- User Voice Identity Settings
create table if not exists public.user_voice_identity_settings (
  user_id uuid primary key references auth.users(id) on delete cascade,
  speaker_identification_enabled boolean default true,
  auto_identify_threshold float default 0.85,
  require_consent boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

