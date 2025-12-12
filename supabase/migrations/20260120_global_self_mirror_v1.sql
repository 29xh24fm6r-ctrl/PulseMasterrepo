-- Global Sense of Self Mirror v1
-- supabase/migrations/20260120_global_self_mirror_v1.sql

-- ============================================
-- SELF MIRROR SNAPSHOTS
-- ============================================

CREATE TABLE IF NOT EXISTS public.self_mirror_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  snapshot_date date NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),

  identity_state jsonb,            -- distilled identity: roles, virtues, current self-story summary
  destiny_state jsonb,             -- what destiny/arc is active and how central it feels
  narrative_state jsonb,           -- chapter name, storyline themes
  values_alignment jsonb,          -- per-value alignment estimates
  behavior_profile jsonb,          -- how they've actually been acting (habits, actions, commitments)

  emotional_profile jsonb,         -- mood patterns, stress, resilience
  relational_profile jsonb,        -- social health summary
  somatic_profile jsonb,           -- body/energy state summary

  overall_alignment numeric,       -- 0..1 with declared identity/destiny/values
  drift_score numeric,             -- 0..1 away from the declared path
  self_compassion_score numeric,   -- 0..1 (how gentle/hard they seem to be with themselves)

  narrative_summary text,          -- short "who you are this week" story
  mirror_insights jsonb            -- structured insights for UI
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_self_mirror_snapshots_user_date
  ON public.self_mirror_snapshots (user_id, snapshot_date);

-- ============================================
-- SELF MIRROR DELTAS
-- ============================================

CREATE TABLE IF NOT EXISTS public.self_mirror_deltas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  created_at timestamptz NOT NULL DEFAULT now(),

  from_snapshot_id uuid NOT NULL REFERENCES self_mirror_snapshots(id) ON DELETE CASCADE,
  to_snapshot_id uuid NOT NULL REFERENCES self_mirror_snapshots(id) ON DELETE CASCADE,

  period_start date NOT NULL,
  period_end date NOT NULL,

  alignment_change numeric,        -- -1..1
  drift_change numeric,            -- -1..1
  self_compassion_change numeric,  -- -1..1

  identity_shifts jsonb,           -- changes in roles/virtues emphasis
  behavior_shifts jsonb,           -- habits/actions moving up/down
  emotional_shifts jsonb,          -- mood/stress pattern shifts
  relational_shifts jsonb,         -- relationship health changes
  somatic_shifts jsonb,            -- energy / health shifts

  summary text,                    -- story of how they've been changing
  key_questions jsonb              -- questions for reflection/coaching
);

CREATE INDEX IF NOT EXISTS idx_self_mirror_deltas_user
  ON public.self_mirror_deltas (user_id, created_at);

-- ============================================
-- SELF MIRROR HIGHLIGHTS
-- ============================================

CREATE TABLE IF NOT EXISTS public.self_mirror_highlights (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  created_at timestamptz NOT NULL DEFAULT now(),

  snapshot_id uuid REFERENCES self_mirror_snapshots(id) ON DELETE SET NULL,
  delta_id uuid REFERENCES self_mirror_deltas(id) ON DELETE SET NULL,

  kind text NOT NULL,               -- 'win', 'risk', 'pattern', 'pivot', 'breakthrough'
  label text NOT NULL,
  description text NOT NULL,
  domain text,                      -- 'work', 'relationships', 'health', 'inner_world', etc.
  importance numeric NOT NULL,      -- 0..1
  suggested_action jsonb            -- optional follow-up recommendations
);

CREATE INDEX IF NOT EXISTS idx_self_mirror_highlights_user
  ON public.self_mirror_highlights (user_id, created_at);


