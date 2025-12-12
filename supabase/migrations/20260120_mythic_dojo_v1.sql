-- Mythic Dojo v1 - Gamified Archetype Training
-- supabase/migrations/20260120_mythic_dojo_v1.sql

-- ============================================
-- MYTHIC BELT LEVELS (Belt Ladder Per Archetype)
-- ============================================

CREATE TABLE IF NOT EXISTS public.mythic_belt_levels (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  archetype_id text NOT NULL REFERENCES archetype_definitions(id),

  belt_rank integer NOT NULL,    -- 1..N
  belt_name text NOT NULL,       -- 'White','Yellow','Orange','Green','Blue','Purple','Brown','Black'
  display_label text,            -- e.g. 'Builder – Blue Belt'

  required_xp integer NOT NULL,  -- total XP for this archetype
  min_time_days integer,         -- optional minimum days training

  UNIQUE (archetype_id, belt_rank)
);

-- Seed belt ladders for each archetype (standard progression)
-- White (1) -> Yellow (2) -> Orange (3) -> Green (4) -> Blue (5) -> Purple (6) -> Brown (7) -> Black (8)
INSERT INTO public.mythic_belt_levels (archetype_id, belt_rank, belt_name, display_label, required_xp, min_time_days)
SELECT 
  id as archetype_id,
  unnest(ARRAY[1, 2, 3, 4, 5, 6, 7, 8]) as belt_rank,
  unnest(ARRAY['White', 'Yellow', 'Orange', 'Green', 'Blue', 'Purple', 'Brown', 'Black']) as belt_name,
  id || ' – ' || unnest(ARRAY['White', 'Yellow', 'Orange', 'Green', 'Blue', 'Purple', 'Brown', 'Black']) || ' Belt' as display_label,
  unnest(ARRAY[0, 50, 150, 300, 500, 750, 1000, 1500]) as required_xp,
  unnest(ARRAY[0, 7, 14, 30, 60, 90, 120, 180]) as min_time_days
FROM public.archetype_definitions
ON CONFLICT (archetype_id, belt_rank) DO NOTHING;

-- ============================================
-- MYTHIC BELT PROGRESS (User Progress Per Archetype)
-- ============================================

CREATE TABLE IF NOT EXISTS public.mythic_belt_progress (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  archetype_id text NOT NULL REFERENCES archetype_definitions(id),

  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  current_xp integer NOT NULL DEFAULT 0,
  current_belt_rank integer NOT NULL DEFAULT 1,  -- maps to mythic_belt_levels
  last_promotion_at timestamptz,

  total_missions_completed integer NOT NULL DEFAULT 0,
  streak_days integer NOT NULL DEFAULT 0
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_mythic_belt_progress_user_archetype
  ON public.mythic_belt_progress (user_id, archetype_id);

-- ============================================
-- MYTHIC ACHIEVEMENTS (Archetype-Specific Badges)
-- ============================================

CREATE TABLE IF NOT EXISTS public.mythic_achievements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  created_at timestamptz NOT NULL DEFAULT now(),

  archetype_id text NOT NULL REFERENCES archetype_definitions(id),
  code text NOT NULL,            -- 'BUILDER_FIRST_50_XP', 'KING_FIRST_COUNCIL', etc.
  label text NOT NULL,
  description text,
  meta jsonb
);

CREATE INDEX IF NOT EXISTS idx_mythic_achievements_user
  ON public.mythic_achievements (user_id, archetype_id);


