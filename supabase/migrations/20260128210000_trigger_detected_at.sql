-- Ensure detected_at column exists on pulse_trigger_candidates.
-- Idempotent: column already exists in v1 schema, this is a safety net.
ALTER TABLE public.pulse_trigger_candidates
ADD COLUMN IF NOT EXISTS detected_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
