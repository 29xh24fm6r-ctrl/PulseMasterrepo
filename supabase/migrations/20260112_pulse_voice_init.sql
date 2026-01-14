-- Pulse Voice Core Database Initialization

-- 1. Call Sessions Table
create table if not exists pulse_call_sessions (
  id uuid primary key default gen_random_uuid(),
  owner_user_id text not null, -- Links to the human user initiating/owning the call
  target_phone text not null,
  task_type text not null, -- e.g., 'APPOINTMENT_BOOKING', 'PAYMENT', 'INFORMATION'
  status text not null, -- High level status: 'PLANNED', 'IN_PROGRESS', 'COMPLETED', 'FAILED'
  current_state text not null, -- Granular state from state machine: 'DIALING', 'IVR', 'HUMAN'
  intent_summary text,
  confidence_score numeric,
  started_at timestamptz default now(),
  completed_at timestamptz,
  twilio_call_sid text -- Store Twilio Call SID for reference
);

-- 2. Call Events (Timeline)
create table if not exists pulse_call_events (
  id uuid primary key default gen_random_uuid(),
  call_session_id uuid references pulse_call_sessions(id) on delete cascade,
  event_type text not null, -- e.g., 'STATE_CHANGE', 'TOOL_USE', 'ERROR'
  payload jsonb,
  created_at timestamptz default now()
);

-- 3. Call Transcripts
create table if not exists pulse_call_transcripts (
  id uuid primary key default gen_random_uuid(),
  call_session_id uuid references pulse_call_sessions(id) on delete cascade,
  speaker text check (speaker in ('pulse','human','system')),
  content text,
  confidence numeric,
  created_at timestamptz default now()
);

-- Indexes for performance
create index if not exists idx_pulse_call_sessions_owner on pulse_call_sessions(owner_user_id);
create index if not exists idx_pulse_call_sessions_status on pulse_call_sessions(status);
create index if not exists idx_pulse_call_events_session on pulse_call_events(call_session_id);
create index if not exists idx_pulse_call_transcripts_session on pulse_call_transcripts(call_session_id);
