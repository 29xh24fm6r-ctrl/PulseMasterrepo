-- Phase 3: Pulse Voice Dynamic IVR & Conversation
-- Adds support for:
-- 1. Conversation modes (MACRO vs DYNAMIC vs CONVERSATION)
-- 2. Real-time media streams (Twilio Streams)
-- 3. Dynamic IVR prompt tracking
-- 4. Full conversation turn logging (pulse_call_turns)
-- 5. Action consistency tracking (pulse_voice_actions)

alter table pulse_call_sessions
  add column if not exists mode text default 'MACRO', -- MACRO | DYNAMIC | CONVERSATION
  add column if not exists stream_sid text,
  add column if not exists stream_status text default 'NONE',
  add column if not exists ivr_last_prompt text,
  add column if not exists ivr_last_options jsonb,
  add column if not exists active_tool text;

create table if not exists pulse_call_turns (
  id uuid primary key default gen_random_uuid(),
  call_session_id uuid references pulse_call_sessions(id) on delete cascade,
  turn_index int not null,
  role text not null check (role in ('system','ivr','human','pulse')),
  content text not null,
  confidence numeric,
  created_at timestamptz default now()
);

create index if not exists idx_pulse_call_turns_session
  on pulse_call_turns (call_session_id, turn_index);

create table if not exists pulse_voice_actions (
  id uuid primary key default gen_random_uuid(),
  call_session_id uuid references pulse_call_sessions(id) on delete cascade,
  action_type text not null, -- DTMF | SAY | REDIRECT | WAIT | HANGUP
  payload jsonb not null,
  outcome text default 'PLANNED', -- PLANNED | SENT | CONFIRMED | FAILED
  created_at timestamptz default now()
);

create index if not exists idx_pulse_voice_actions_session
  on pulse_voice_actions (call_session_id, created_at);
