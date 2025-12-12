-- Desire Modeling + Behavioral Prediction v1
-- supabase/migrations/20260120_desire_and_behavior_prediction_v1.sql

-- ============================================
-- DESIRE SIGNALS
-- ============================================

CREATE TABLE IF NOT EXISTS public.desire_signals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  entity_type text NOT NULL,        -- 'self' or 'contact'
  entity_id text NOT NULL,          -- user_id or contact_id (string key)
  source text NOT NULL,             -- 'tasks', 'deals', 'email', 'journal', 'calls', 'manual'
  signal_time timestamptz NOT NULL DEFAULT now(),
  context text,                     -- 'work', 'family', 'health', 'money', 'social', 'self'
  kind text NOT NULL,               -- 'chose', 'avoided', 'complained', 'celebrated', 'requested', etc.
  description text,                 -- human-readable
  features jsonb,                   -- structured machine-readable features
  valence numeric,                  -- -1..1 (how positive/negative)
  weight numeric DEFAULT 1,         -- weight in modeling

  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_desire_signals_user_entity
  ON public.desire_signals (user_id, entity_type, entity_id, signal_time);

-- ============================================
-- DESIRE PROFILES
-- ============================================

CREATE TABLE IF NOT EXISTS public.desire_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  entity_type text NOT NULL,          -- 'self' or 'contact'
  entity_id text NOT NULL,            -- user_id or contact_id
  last_refreshed_at timestamptz NOT NULL DEFAULT now(),

  summary text,                       -- plain-language description: "wants X, cares about Y..."
  priorities jsonb,                   -- { "work_success": 0.9, "family_warmth": 0.95, ... }
  avoidance_triggers jsonb,           -- [{ "label": "...", "contexts": [...], "severity": 0.8 }, ...]
  preferred_styles jsonb,             -- communication / interaction styles
  reward_signals jsonb,               -- what seems to feel rewarding
  long_term_desires jsonb,            -- { "label": "...", "strength": 0.9 }[]
  short_term_preferences jsonb,       -- context-level preferences

  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  UNIQUE (user_id, entity_type, entity_id)
);

CREATE INDEX IF NOT EXISTS idx_desire_profiles_user_entity
  ON public.desire_profiles (user_id, entity_type, entity_id);

-- ============================================
-- BEHAVIOR PREDICTIONS
-- ============================================

CREATE TABLE IF NOT EXISTS public.behavior_predictions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  entity_type text NOT NULL,      -- 'self' or 'contact'
  entity_id text NOT NULL,        -- user_id or contact_id
  target_type text NOT NULL,      -- 'goal', 'task', 'habit', 'interaction', 'relationship', 'response'
  target_id text,                 -- id in that domain (task_id, goal_id, contact_id, thread_id, etc.)

  horizon text NOT NULL,          -- 'today', 'this_week', '24h', '7d', '30d'
  prediction_time timestamptz NOT NULL DEFAULT now(),

  outcome_label text NOT NULL,    -- 'will_complete', 'will_skip', 'will_reply', 'likely_conflict', etc.
  probability numeric NOT NULL,   -- 0..1
  reasoning_summary text,         -- short explanation for transparency
  features_used jsonb,            -- optional: underlying signals used
  recommended_intervention jsonb, -- suggestions for Pulse/user (non-manipulative support)

  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_behavior_predictions_user_entity
  ON public.behavior_predictions (user_id, entity_type, entity_id, prediction_time);

CREATE INDEX IF NOT EXISTS idx_behavior_predictions_horizon
  ON public.behavior_predictions (user_id, horizon, prediction_time);


