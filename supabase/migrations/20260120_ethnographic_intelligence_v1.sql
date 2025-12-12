-- Ethnographic Intelligence v1 - Cultural Brain
-- supabase/migrations/20260120_ethnographic_intelligence_v1.sql

-- ============================================
-- CULTURAL DOMAINS (Defines the Buckets of Culture)
-- ============================================

CREATE TABLE IF NOT EXISTS public.cultural_domains (
  id text PRIMARY KEY,
  display_name text NOT NULL,
  description text NOT NULL
);

INSERT INTO public.cultural_domains (id, display_name, description) VALUES
  ('institution', 'Institutional Culture', 'Norms and unwritten rules inside the user''s workplace or major organizations.'),
  ('industry', 'Industry Culture', 'Norms and expectations of the user''s field, such as banking and SBA lending.'),
  ('team', 'Team Culture', 'Patterns and behaviors inside the user''s immediate team.'),
  ('leader', 'Leadership Culture', 'Styles, expectations, and tendencies of decision-makers.'),
  ('relationship', 'Relationship Culture', 'Cultural norms inside family/social environments.')
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- CULTURAL PROFILES (Evolving Cultural Models)
-- ============================================

CREATE TABLE IF NOT EXISTS public.cultural_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  domain text NOT NULL REFERENCES cultural_domains(id),

  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  norms jsonb,              -- e.g. "fast responses expected", "conflict avoidance", etc.
  risk_tolerance jsonb,      -- e.g. "moderate", "formal", "conservative SBA posture"
  communication_style jsonb, -- direct, indirect, formal, supportive
  approval_dynamics jsonb,   -- e.g. "Bennett signs off when X is present"
  decision_patterns jsonb,   -- heuristics/patterns
  cultural_rules jsonb,      -- unwritten rules
  cultural_red_flags jsonb,  -- things to avoid
  cultural_opportunities jsonb -- things to leverage
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_cultural_profiles_user_domain
  ON public.cultural_profiles (user_id, domain);

-- ============================================
-- CULTURAL SIGNALS (Input Signals for Inference)
-- ============================================

CREATE TABLE IF NOT EXISTS public.cultural_signals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  created_at timestamptz NOT NULL DEFAULT now(),

  domain text NOT NULL REFERENCES cultural_domains(id),

  source text NOT NULL,                 -- "email", "meeting", "task", "deal", "reflection"
  content jsonb,                        -- extracted signal (e.g. "Boss rejects proposals lacking X")
  weight numeric NOT NULL DEFAULT 0.5   -- importance of the signal
);

CREATE INDEX IF NOT EXISTS idx_cultural_signals_user_domain
  ON public.cultural_signals (user_id, domain, created_at DESC);

-- ============================================
-- CULTURAL INFERENCE SNAPSHOTS (Periodic Inference)
-- ============================================

CREATE TABLE IF NOT EXISTS public.cultural_inference_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  domain text NOT NULL REFERENCES cultural_domains(id),

  snapshot_time timestamptz NOT NULL DEFAULT now(),

  inferred_profile jsonb,   -- updated norms, expectations, tendencies
  confidence numeric NOT NULL, -- 0..1
  evidence jsonb            -- top signals used
);

CREATE INDEX IF NOT EXISTS idx_cultural_inference_snapshots_user_domain
  ON public.cultural_inference_snapshots (user_id, domain, snapshot_time DESC);

-- ============================================
-- CULTURAL PREDICTIONS (Predicts Cultural Responses)
-- ============================================

CREATE TABLE IF NOT EXISTS public.cultural_predictions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  created_at timestamptz NOT NULL DEFAULT now(),

  domain text NOT NULL REFERENCES cultural_domains(id),

  context jsonb,          -- user's described scenario
  predicted_response jsonb,
  recommended_strategy jsonb,
  confidence numeric
);

CREATE INDEX IF NOT EXISTS idx_cultural_predictions_user_domain
  ON public.cultural_predictions (user_id, domain, created_at DESC);

-- ============================================
-- CULTURAL HIGHLIGHTS (Insights for Console)
-- ============================================

CREATE TABLE IF NOT EXISTS public.cultural_highlights (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  created_at timestamptz NOT NULL DEFAULT now(),

  domain text NOT NULL REFERENCES cultural_domains(id),

  title text NOT NULL,
  description text NOT NULL,
  importance numeric NOT NULL DEFAULT 0.5,
  suggestion jsonb
);

CREATE INDEX IF NOT EXISTS idx_cultural_highlights_user
  ON public.cultural_highlights (user_id, created_at DESC);


