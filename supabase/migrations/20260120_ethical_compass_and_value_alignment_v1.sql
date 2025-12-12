-- Ethical Compass + Value Alignment v1
-- supabase/migrations/20260120_ethical_compass_and_value_alignment_v1.sql

-- ============================================
-- ETHICAL POLICIES
-- ============================================

CREATE TABLE IF NOT EXISTS public.ethical_policies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id) ON DELETE CASCADE, 
  -- null user_id = global/system policy

  scope text NOT NULL,          -- 'system', 'user', 'domain'
  domain text,                  -- 'general', 'finance', 'relationships', 'health', etc.
  key text NOT NULL,            -- 'no_sexual_content', 'no_deception', 'family_first', etc.
  name text NOT NULL,
  description text,
  priority int NOT NULL DEFAULT 100,   -- smaller = higher priority
  is_active boolean NOT NULL DEFAULT true,
  rule jsonb,                   -- structured rule definition (conditions/actions)
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  UNIQUE (user_id, scope, domain, key)
);

CREATE INDEX IF NOT EXISTS idx_ethical_policies_user
  ON public.ethical_policies (user_id, scope, domain);

-- ============================================
-- VALUE PROFILE
-- ============================================

CREATE TABLE IF NOT EXISTS public.value_profile (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  last_refreshed_at timestamptz NOT NULL DEFAULT now(),
  summary text,                         -- "What I stand for" in plain language
  core_values jsonb,                    -- [{ key, name, description, strength }]
  role_priorities jsonb,                -- { 'father': 0.95, 'builder': 0.9, 'banker': 0.8, ... }
  red_lines jsonb,                      -- things user explicitly does NOT want to do
  aspiration_statement text,            -- one-sentence future self description

  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_value_profile_user
  ON public.value_profile (user_id);

-- ============================================
-- ALIGNMENT EVALUATIONS
-- ============================================

CREATE TABLE IF NOT EXISTS public.alignment_evaluations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  evaluated_at timestamptz NOT NULL DEFAULT now(),
  source text NOT NULL,           -- 'autopilot', 'coach', 'planner', 'simulation', etc.
  context_type text NOT NULL,     -- 'action', 'plan', 'message', 'decision_option'
  context_id text,                -- reference id (task id, sequence id, etc.)

  input_summary text,             -- short description of what was evaluated

  ethical_risk numeric NOT NULL,  -- 0..1 (0 = clean, 1 = very problematic)
  value_alignment numeric NOT NULL, -- 0..1 (1 = strongly aligned with user values)
  red_flags jsonb,                -- list of { key, severity, explanation }
  approvals jsonb,                -- list of positive alignments { key, explanation }
  recommended_adjustment text,    -- "Change X to Y" or "Do not proceed"
  final_recommendation text,      -- 'allow', 'allow_with_changes', 'block', 'escalate_to_user'

  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_alignment_evaluations_user_time
  ON public.alignment_evaluations (user_id, evaluated_at);

CREATE INDEX IF NOT EXISTS idx_alignment_evaluations_source
  ON public.alignment_evaluations (user_id, source, evaluated_at);

-- ============================================
-- GUARDRAIL EVENTS
-- ============================================

CREATE TABLE IF NOT EXISTS public.guardrail_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  occurred_at timestamptz NOT NULL DEFAULT now(),
  source text NOT NULL,           -- 'autopilot', 'coach', 'kernel', etc.
  context_type text NOT NULL,     -- 'action', 'message', etc.
  context_id text,
  policy_keys text[],             -- policies involved
  action text NOT NULL,           -- 'blocked', 'modified', 'warned_user'
  message_to_user text,           -- explanation text used or available
  details jsonb,                  -- additional structured info

  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_guardrail_events_user_time
  ON public.guardrail_events (user_id, occurred_at);

-- Seed system-level policies
INSERT INTO public.ethical_policies (user_id, scope, domain, key, name, description, priority, is_active, rule)
VALUES
  (NULL, 'system', 'general', 'no_sexual_content', 'No Sexual Content', 'Pulse must never generate, suggest, or enable sexual content or behavior.', 10, true, '{"when": ["content_contains_sexuality"], "then": ["block", "explain_to_user"]}'::jsonb),
  (NULL, 'system', 'general', 'no_harm_self_or_others', 'No Harm', 'Pulse must never suggest actions that could cause physical, emotional, or financial harm to the user or others.', 10, true, '{"when": ["action_could_cause_harm"], "then": ["block", "explain_to_user"]}'::jsonb),
  (NULL, 'system', 'general', 'no_illegal_activity', 'No Illegal Activity', 'Pulse must never suggest or enable illegal activities.', 10, true, '{"when": ["action_is_illegal"], "then": ["block", "explain_to_user"]}'::jsonb),
  (NULL, 'system', 'general', 'no_manipulative_persuasion', 'No Manipulative Persuasion', 'Pulse must never use deceptive, coercive, or psychologically exploitative tactics.', 20, true, '{"when": ["action_is_manipulative"], "then": ["block", "explain_to_user"]}'::jsonb),
  (NULL, 'system', 'general', 'respect_user_autonomy', 'Respect User Autonomy', 'Pulse must always preserve user autonomy and never override user decisions without explicit consent.', 20, true, '{"when": ["action_overrides_autonomy"], "then": ["warn", "require_confirmation"]}'::jsonb),
  (NULL, 'system', 'general', 'protect_user_privacy', 'Protect User Privacy', 'Pulse must protect user data sanctity and privacy.', 20, true, '{"when": ["action_compromises_privacy"], "then": ["block", "explain_to_user"]}'::jsonb)
ON CONFLICT (user_id, scope, domain, key) DO NOTHING;


