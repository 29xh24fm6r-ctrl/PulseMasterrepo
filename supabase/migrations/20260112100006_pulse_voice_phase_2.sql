-- Phase 2: Status callbacks + recording/transcript plumbing + IVR macros

alter table pulse_call_sessions
  add column if not exists twilio_call_sid text,
  add column if not exists twilio_recording_sid text,
  add column if not exists last_twilio_status text,
  add column if not exists last_twilio_error text,
  add column if not exists ivr_mode boolean default false,
  add column if not exists ivr_plan jsonb,
  add column if not exists ivr_step integer default 0,
  add column if not exists transcript_status text default 'NONE',
  add column if not exists transcript_summary text;

create index if not exists idx_pulse_call_sessions_twilio_call_sid
  on pulse_call_sessions (twilio_call_sid);

create index if not exists idx_pulse_call_events_call_session_id
  on pulse_call_events (call_session_id);

create index if not exists idx_pulse_call_transcripts_call_session_id
  on pulse_call_transcripts (call_session_id);

-- Optional: store raw Twilio callbacks for auditing (helps debugging)
create table if not exists pulse_call_callbacks (
  id uuid primary key default gen_random_uuid(),
  call_session_id uuid references pulse_call_sessions(id) on delete cascade,
  callback_type text not null,
  payload jsonb not null,
  created_at timestamptz default now()
);

create index if not exists idx_pulse_call_callbacks_call_session_id
  on pulse_call_callbacks (call_session_id);
