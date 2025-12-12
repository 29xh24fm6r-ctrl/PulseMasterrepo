-- Pulse Live Call Sessions
-- supabase/migrations/005_pulse_live_sessions.sql

-- Call Sessions Table
CREATE TABLE IF NOT EXISTS call_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_user_id TEXT NOT NULL,
  source TEXT NOT NULL CHECK (source IN ('browser', 'upload', 'platform', 'transcript')),
  calendar_event_id UUID NULL,
  linked_deal_id UUID NULL,
  participant_emails TEXT[] DEFAULT '{}',
  speaker_map JSONB DEFAULT '{}',
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ended_at TIMESTAMPTZ NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'ended', 'archived')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Call Segments Table (diarized transcript chunks)
CREATE TABLE IF NOT EXISTS call_segments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES call_sessions(id) ON DELETE CASCADE,
  owner_user_id TEXT NOT NULL,
  speaker_key TEXT NOT NULL, -- spk_0, spk_1, etc.
  contact_id UUID NULL, -- Resolved CRM contact
  text TEXT NOT NULL,
  start_time REAL NOT NULL, -- Seconds from session start
  end_time REAL NOT NULL,
  confidence REAL NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Call Summaries Table (rolling summary)
CREATE TABLE IF NOT EXISTS call_summaries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES call_sessions(id) ON DELETE CASCADE,
  owner_user_id TEXT NOT NULL,
  summary_text TEXT NOT NULL,
  action_items JSONB DEFAULT '[]',
  decisions JSONB DEFAULT '[]',
  objections JSONB DEFAULT '[]',
  risks JSONB DEFAULT '[]',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(session_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_call_sessions_owner ON call_sessions(owner_user_id, status);
CREATE INDEX IF NOT EXISTS idx_call_segments_session ON call_segments(session_id, start_time);
CREATE INDEX IF NOT EXISTS idx_call_segments_contact ON call_segments(contact_id) WHERE contact_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_call_summaries_session ON call_summaries(session_id);

