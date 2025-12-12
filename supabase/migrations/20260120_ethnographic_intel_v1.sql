-- Ethnographic / Cultural Intelligence v1
-- supabase/migrations/20260120_ethnographic_intel_v1.sql

-- ============================================
-- CULTURE CONTEXTS
-- ============================================

CREATE TABLE IF NOT EXISTS public.culture_contexts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  key text NOT NULL,                  -- 'old_glory_bank', 'family_core', 'friends_group', 'local_region', 'industry_commercial_banking'
  name text NOT NULL,                 -- human label: 'Old Glory Bank', 'Family at Home', etc.
  kind text NOT NULL,                 -- 'organization', 'team', 'family', 'friend_group', 'industry', 'region'
  description text,
  priority numeric NOT NULL DEFAULT 0.5
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_culture_contexts_user_key
  ON public.culture_contexts (user_id, key);

-- ============================================
-- CULTURE PROFILES
-- ============================================

CREATE TABLE IF NOT EXISTS public.culture_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  context_id uuid NOT NULL REFERENCES culture_contexts(id) ON DELETE CASCADE,

  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  norms jsonb,                        -- { punctuality: 'high', hierarchy: 'strong', risk_taking: 'low', etc. }
  communication_style jsonb,          -- { email_tone, meeting_style, humor_allowed, directness, formality }
  success_markers jsonb,              -- what is rewarded
  taboo_behaviors jsonb,              -- what gets punished / frowned upon
  political_sensitivities jsonb,      -- neutral description: topics to avoid / handle delicately
  language_patterns jsonb,            -- jargon, phrases, ways of framing things

  decision_making_style jsonb,        -- how decisions are actually made
  hidden_rules jsonb,                 -- unwritten rules: "never go around X", etc.

  summary text
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_culture_profiles_user_context
  ON public.culture_profiles (user_id, context_id);

-- ============================================
-- CULTURE NORM LOGS
-- ============================================

CREATE TABLE IF NOT EXISTS public.culture_norm_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  context_id uuid NOT NULL REFERENCES culture_contexts(id) ON DELETE CASCADE,

  created_at timestamptz NOT NULL DEFAULT now(),

  source text,                        -- 'email', 'meeting', 'note', 'manual_entry'
  summary text,                       -- observation
  tags text[],                        -- ['hierarchy', 'risk_aversion', etc.]
  weight numeric NOT NULL DEFAULT 0.5
);

CREATE INDEX IF NOT EXISTS idx_culture_norm_logs_user_context
  ON public.culture_norm_logs (user_id, context_id, created_at);

-- ============================================
-- CULTURE ALIGNMENT LOG
-- ============================================

CREATE TABLE IF NOT EXISTS public.culture_alignment_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  context_id uuid NOT NULL REFERENCES culture_contexts(id) ON DELETE CASCADE,

  evaluated_at timestamptz NOT NULL DEFAULT now(),

  alignment_overall numeric NOT NULL,     -- 0..1
  strengths jsonb,                        -- where user fits culture well
  friction_points jsonb,                  -- where user clashes with norms
  risk_areas jsonb,                       -- areas that may threaten goals (e.g. promotion)
  suggestions jsonb                       -- small changes to navigate culture better
);

CREATE INDEX IF NOT EXISTS idx_culture_alignment_log_user
  ON public.culture_alignment_log (user_id, evaluated_at);


