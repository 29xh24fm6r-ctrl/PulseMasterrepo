-- Create pulse_effects table for runtime plan tracking
-- Required by /api/runtime/plan endpoint
--
-- This table tracks effects/actions that Pulse proposes or executes
-- Domain examples: calendar, tasks, routines
-- Status flow: queued → proposed → applied/approved → reverted/declined

CREATE TABLE IF NOT EXISTS public.pulse_effects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  domain TEXT,
  action TEXT,
  status TEXT DEFAULT 'queued',
  explanation TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Index for fast user-based queries
CREATE INDEX IF NOT EXISTS pulse_effects_user_id_idx ON public.pulse_effects(user_id);
CREATE INDEX IF NOT EXISTS pulse_effects_created_at_idx ON public.pulse_effects(created_at DESC);

-- Enable RLS
ALTER TABLE public.pulse_effects ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can only see their own effects
-- CRITICAL: Use the canonical policy name for consistency
CREATE POLICY pulse_user_owns_row ON public.pulse_effects
  FOR ALL USING (user_id = current_setting('request.jwt.claims')::json->>'sub');

-- Grant access to authenticated users
GRANT ALL ON public.pulse_effects TO authenticated;
GRANT ALL ON public.pulse_effects TO service_role;
