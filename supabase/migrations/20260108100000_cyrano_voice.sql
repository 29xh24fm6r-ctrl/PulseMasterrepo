-- Create calls table for Cyrano Voice
CREATE TABLE IF NOT EXISTS calls (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) NOT NULL,
    twilio_call_sid TEXT UNIQUE,
    status TEXT DEFAULT 'incoming', -- incoming, in-progress, completed, failed
    transcript TEXT,
    started_at TIMESTAMPTZ DEFAULT now(),
    ended_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Index for realtime lookups
CREATE INDEX IF NOT EXISTS idx_calls_status ON calls(status);
CREATE INDEX IF NOT EXISTS idx_calls_sid ON calls(twilio_call_sid);

-- Enable RLS
ALTER TABLE calls ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own calls"
    ON calls FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own calls"
    ON calls FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own calls"
    ON calls FOR UPDATE
    USING (auth.uid() = user_id);

-- RPC for atomic transcript appending
-- This is crucial for real-time streaming to avoid race conditions
CREATE OR REPLACE FUNCTION append_call_transcript(p_call_sid TEXT, p_text TEXT)
RETURNS VOID AS $$
BEGIN
  UPDATE calls
  SET transcript = COALESCE(transcript, '') || ' ' || p_text
  WHERE twilio_call_sid = p_call_sid;
END;
$$ LANGUAGE plpgsql;

-- Grant access to authenticated users
GRANT EXECUTE ON FUNCTION append_call_transcript(TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION append_call_transcript(TEXT, TEXT) TO service_role;
