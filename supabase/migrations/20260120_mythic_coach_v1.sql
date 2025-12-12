-- Mythic Coach v1 - Training Your Inner Archetypes
-- supabase/migrations/20260120_mythic_coach_v1.sql

-- ============================================
-- MYTHIC TRAINING PLANS (High-Level Arcs)
-- ============================================

CREATE TABLE IF NOT EXISTS public.mythic_training_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  archetype_id text NOT NULL REFERENCES archetype_definitions(id),

  plan_label text NOT NULL,            -- "Builder 90-Day Foundation", "King in Work, Lover at Home"
  description text,

  duration_days integer NOT NULL,      -- e.g. 30, 60, 90
  intensity text NOT NULL,             -- 'light','moderate','intense'

  goals jsonb,                         -- what this plan aims to change
  constraints jsonb,                   -- do-not-cross lines (e.g., family time, health limits)

  status text NOT NULL DEFAULT 'active', -- 'active','completed','paused','abandoned'
  progress jsonb                       -- { percentComplete, startedAt, expectedEnd, ... }
);

CREATE INDEX IF NOT EXISTS idx_mythic_training_plans_user
  ON public.mythic_training_plans (user_id, created_at DESC);

-- ============================================
-- MYTHIC TRAINING FOCUS (Current Priorities)
-- ============================================

CREATE TABLE IF NOT EXISTS public.mythic_training_focus (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  created_at timestamptz NOT NULL DEFAULT now(),

  primary_targets jsonb,       -- [{ archetype_id, mode: 'grow'|'stabilize'|'cool', reason }]
  secondary_targets jsonb,     -- same shape
  rationale text,              -- explanation for current focus

  linked_chapter_id uuid REFERENCES life_chapters(id),
  linked_snapshot_id uuid REFERENCES life_canon_snapshots(id),
  linked_archetype_snapshot_id uuid REFERENCES archetype_snapshots(id)
);

CREATE INDEX IF NOT EXISTS idx_mythic_training_focus_user_time
  ON public.mythic_training_focus (user_id, created_at DESC);

-- ============================================
-- MYTHIC TRAINING MISSIONS (Concrete Actions)
-- ============================================

CREATE TABLE IF NOT EXISTS public.mythic_training_missions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  created_at timestamptz NOT NULL DEFAULT now(),
  due_date date,

  archetype_id text NOT NULL REFERENCES archetype_definitions(id),
  plan_id uuid REFERENCES mythic_training_plans(id) ON DELETE SET NULL,

  title text NOT NULL,
  description text,
  cadence text NOT NULL,        -- 'daily','weekly','once','custom'
  estimated_effort_minutes integer,

  xp_value integer NOT NULL DEFAULT 10,
  tags text[],                  -- 'work','family','health','inner_work', etc.

  status text NOT NULL DEFAULT 'pending',   -- 'pending','completed','skipped','expired'
  completed_at timestamptz,
  completion_notes text
);

CREATE INDEX IF NOT EXISTS idx_mythic_training_missions_user_due
  ON public.mythic_training_missions (user_id, due_date);

-- ============================================
-- MYTHIC TRAINING REFLECTIONS (Feedback)
-- ============================================

CREATE TABLE IF NOT EXISTS public.mythic_training_reflections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  period_start date NOT NULL,
  period_end date NOT NULL,

  created_at timestamptz NOT NULL DEFAULT now(),

  archetype_id text NOT NULL REFERENCES archetype_definitions(id),

  self_rating numeric,        -- 0..1 how well they embodied archetype
  coach_rating numeric,       -- 0..1 model's evaluation

  wins jsonb,                 -- list of wins tied to this archetype
  challenges jsonb,           -- issues, shadow patterns
  adjustments jsonb           -- how to tweak missions or focus
);

CREATE INDEX IF NOT EXISTS idx_mythic_training_reflections_user_time
  ON public.mythic_training_reflections (user_id, period_start, period_end);


