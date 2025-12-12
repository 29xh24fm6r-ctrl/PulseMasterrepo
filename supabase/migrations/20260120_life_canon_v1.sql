-- Life Canon v1 - Master Narrative Engine
-- supabase/migrations/20260120_life_canon_v1.sql

-- ============================================
-- LIFE CHAPTERS (Periods of Life)
-- ============================================

CREATE TABLE IF NOT EXISTS public.life_chapters (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),

  chapter_order integer NOT NULL,           -- chronological order
  title text NOT NULL,
  subtitle text,
  summary text,

  start_time timestamptz,
  end_time timestamptz,

  tone jsonb,                                -- emotional tone vectors
  themes jsonb,                              -- { rising: [...], fading: [...] }
  internal_conflicts jsonb,
  external_conflicts jsonb,
  identity_state jsonb,
  destiny_state jsonb,
  relationship_state jsonb,
  somatic_state jsonb
);

CREATE INDEX IF NOT EXISTS idx_life_chapters_user_order
  ON public.life_chapters (user_id, chapter_order);

-- ============================================
-- CANON EVENTS (Milestones of Self-Definition)
-- ============================================

CREATE TABLE IF NOT EXISTS public.canon_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  created_at timestamptz DEFAULT now(),

  event_type text NOT NULL,         -- 'identity_shift','relationship','career','health','decision','crisis','breakthrough'
  title text NOT NULL,
  description text,

  emotional_tone jsonb,
  consequences jsonb,
  importance numeric NOT NULL,      -- 0..1
  attached_chapter uuid REFERENCES life_chapters(id) ON DELETE SET NULL,

  source text,                      -- 'council','strategic','relationship_engine','somatic','manual'
  source_id uuid
);

CREATE INDEX IF NOT EXISTS idx_canon_events_user_time
  ON public.canon_events (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_canon_events_chapter
  ON public.canon_events (attached_chapter);

-- ============================================
-- IDENTITY TRANSFORMS (Identity Shifts)
-- ============================================

CREATE TABLE IF NOT EXISTS public.identity_transforms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  occurred_at timestamptz DEFAULT now(),

  previous_identity jsonb,
  new_identity jsonb,

  catalysts jsonb,
  emotions jsonb,
  narrative_explanation text
);

CREATE INDEX IF NOT EXISTS idx_identity_transforms_user_time
  ON public.identity_transforms (user_id, occurred_at DESC);

-- ============================================
-- CANON TIMELINE INDEX (Visual Timeline Sorting)
-- ============================================

CREATE TABLE IF NOT EXISTS public.canon_timeline_index (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  created_at timestamptz DEFAULT now(),

  chapter_id uuid REFERENCES life_chapters(id) ON DELETE CASCADE,
  event_id uuid REFERENCES canon_events(id) ON DELETE CASCADE,

  timeline_position numeric NOT NULL   -- used to sort events visually in UI
);

CREATE INDEX IF NOT EXISTS idx_canon_timeline_user_position
  ON public.canon_timeline_index (user_id, timeline_position);

-- ============================================
-- LIFE CANON SNAPSHOTS (Periodic Summaries)
-- ============================================

CREATE TABLE IF NOT EXISTS public.life_canon_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  snapshot_time timestamptz DEFAULT now(),

  active_chapter jsonb,
  recent_events jsonb,
  active_themes jsonb,
  narrative_summary text,
  predicted_next_chapter jsonb,
  upcoming_turning_points jsonb
);

CREATE INDEX IF NOT EXISTS idx_life_canon_snapshots_user_time
  ON public.life_canon_snapshots (user_id, snapshot_time DESC);


