-- Meta-Learning & Wisdom Engine v1
-- supabase/migrations/20260120_meta_learning_and_wisdom_engine_v1.sql

-- ============================================
-- EXPERIENCE EVENTS
-- ============================================

CREATE TABLE IF NOT EXISTS public.experience_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  occurred_at timestamptz NOT NULL DEFAULT now(),
  source text NOT NULL,          -- 'autopilot', 'coach', 'planner', 'simulation', 'user_action', 'system'
  kind text NOT NULL,            -- 'action', 'prediction', 'advice', 'decision', 'scenario'
  ref_type text,                 -- 'task', 'goal', 'message', 'relationship', 'deal', etc.
  ref_id text,                   -- foreign id in that domain

  description text,              -- human-readable summary

  context jsonb,                 -- snapshot: emotion, somatic, narrative, workspace, social metrics
  expectation jsonb,             -- what was predicted/intended
  outcome jsonb,                 -- what actually happened
  evaluation jsonb,              -- { success_score, alignment_delta, notes }

  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_experience_events_user_time
  ON public.experience_events (user_id, occurred_at);

CREATE INDEX IF NOT EXISTS idx_experience_events_source
  ON public.experience_events (user_id, source, occurred_at);

-- ============================================
-- WISDOM LESSONS
-- ============================================

CREATE TABLE IF NOT EXISTS public.wisdom_lessons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  status text NOT NULL DEFAULT 'active',   -- 'active', 'deprecated'
  scope text NOT NULL,                    -- 'personal', 'shared_template' (future)
  domain text,                             -- 'work', 'relationships', 'health', 'finance', etc.

  title text NOT NULL,                     -- short: "Don't schedule heavy tasks after court days"
  summary text,                            -- 1–3 sentence explanation

  condition jsonb,                         -- structured "when" features
  recommendation jsonb,                    -- structured "do this" suggestion
  avoid jsonb,                             -- structured "avoid that"

  evidence jsonb,                          -- list of experience_event ids + stats
  strength numeric NOT NULL DEFAULT 0.5,   -- 0..1 confidence
  usefulness numeric NOT NULL DEFAULT 0.5   -- 0..1 practical impact
);

CREATE INDEX IF NOT EXISTS idx_wisdom_lessons_user
  ON public.wisdom_lessons (user_id, status);

CREATE INDEX IF NOT EXISTS idx_wisdom_lessons_domain
  ON public.wisdom_lessons (user_id, domain, status);

-- ============================================
-- PERSONAL HEURISTICS
-- ============================================

CREATE TABLE IF NOT EXISTS public.personal_heuristics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  key text NOT NULL,                       -- 'no_back_to_back_court_and_deep_work'
  description text NOT NULL,
  domain text,
  rule jsonb,                              -- e.g., { when: {...}, prefer: {...}, avoid: {...} }

  strength numeric NOT NULL DEFAULT 0.5,   -- 0..1
  last_used_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  UNIQUE (user_id, key)
);

CREATE INDEX IF NOT EXISTS idx_personal_heuristics_user
  ON public.personal_heuristics (user_id);

-- ============================================
-- WISDOM PLAYBOOKS
-- ============================================

CREATE TABLE IF NOT EXISTS public.wisdom_playbooks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  key text NOT NULL,                   -- 'overwhelm_day_protocol', 'relationship_repair', etc.
  name text NOT NULL,
  description text,
  domain text,
  trigger_pattern jsonb,               -- when this playbook is relevant
  lesson_ids uuid[],                   -- linked wisdom_lessons
  heuristic_ids uuid[],                -- linked personal_heuristics

  usage_count int NOT NULL DEFAULT 0,
  last_used_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  UNIQUE (user_id, key)
);

CREATE INDEX IF NOT EXISTS idx_wisdom_playbooks_user
  ON public.wisdom_playbooks (user_id);


