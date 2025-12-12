-- Pulse Surface Events Table
-- Tracks flash moments and delight events
-- supabase/migrations/004_pulse_surface_events.sql

CREATE TABLE IF NOT EXISTS pulse_surface_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_user_id TEXT NOT NULL,
  surface TEXT NOT NULL, -- home, workspace, etc.
  type TEXT NOT NULL, -- WIN, SAVE, BREAKTHROUGH, STREAK
  payload JSONB DEFAULT '{}',
  shown_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pulse_surface_events_owner_surface 
ON pulse_surface_events(owner_user_id, surface, shown_at);

CREATE INDEX IF NOT EXISTS idx_pulse_surface_events_owner_date 
ON pulse_surface_events(owner_user_id, DATE(shown_at));

