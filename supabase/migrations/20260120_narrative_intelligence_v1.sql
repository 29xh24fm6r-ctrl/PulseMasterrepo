-- Narrative Intelligence Engine v1
-- supabase/migrations/20260120_narrative_intelligence_v1.sql

-- ============================================
-- LIFE CHAPTERS
-- ============================================

CREATE TABLE IF NOT EXISTS public.life_chapters (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  chapter_index int NOT NULL,            -- 1, 2, 3... order in life
  title text NOT NULL,                   -- 'Rebuilding After Divorce', 'Birth of Pulse', etc.
  tagline text,                          -- one-line logline
  start_date date NOT NULL,
  end_date date,                         -- null if current
  status text NOT NULL DEFAULT 'active', -- 'active', 'past', 'planned'
  dominant_themes text[],                -- theme keys (see life_themes)
  primary_roles text[],                  -- 'father', 'builder', 'leader'
  emotional_tone jsonb,                  -- { avg_valence, avg_arousal, labels }
  summary text,                          -- 1–3 paragraph story summary

  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  UNIQUE (user_id, chapter_index)
);

CREATE INDEX IF NOT EXISTS idx_life_chapters_user
  ON public.life_chapters (user_id, chapter_index);

-- ============================================
-- LIFE EVENTS
-- ============================================

CREATE TABLE IF NOT EXISTS public.life_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  occurred_at timestamptz NOT NULL,
  kind text NOT NULL,           -- 'career', 'relationship', 'health', 'finance', 'project', 'identity', etc.
  source text NOT NULL,         -- 'system', 'user', 'journal', 'calendar', 'deal', etc.
  ref_type text,                -- 'deal', 'note', 'event', 'goal', etc.
  ref_id text,
  title text NOT NULL,          -- short descriptive title
  summary text,                 -- narrative summary (1–3 sentences)
  impact numeric NOT NULL DEFAULT 0.5,   -- 0–1 importance
  emotional_valence numeric,             -- -1 to 1
  tags text[],                           -- free-form tags
  chapter_id uuid REFERENCES life_chapters(id), -- linked to life_chapters.id when assigned

  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_life_events_user_time
  ON public.life_events (user_id, occurred_at);

CREATE INDEX IF NOT EXISTS idx_life_events_user_chapter
  ON public.life_events (user_id, chapter_id);

-- ============================================
-- LIFE THEMES
-- ============================================

CREATE TABLE IF NOT EXISTS public.life_themes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  key text NOT NULL,           -- 'rebirth', 'craft_mastery', 'family_legacy', etc.
  name text NOT NULL,
  description text,
  domain text[],               -- ['work', 'family', 'health', 'self']
  first_appeared_at date,
  last_active_at date,
  strength numeric,            -- 0–1 (how central to the story)
  example_event_ids uuid[],    -- life_events that illustrate the theme

  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  UNIQUE (user_id, key)
);

CREATE INDEX IF NOT EXISTS idx_life_themes_user
  ON public.life_themes (user_id);

-- ============================================
-- IDENTITY ARCS
-- ============================================

CREATE TABLE IF NOT EXISTS public.identity_arcs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  key text NOT NULL,             -- 'from_solo_hustler_to_system_builder'
  name text NOT NULL,            -- 'From Solo Hustler to System Builder'
  description text,              -- overall story of the arc
  start_date date,
  projected_end_date date,
  status text NOT NULL DEFAULT 'active', -- 'active', 'completed', 'abandoned'
  associated_roles text[],       -- 'father', 'founder', 'banker', etc.
  driving_values text[],         -- from identity engine
  related_theme_keys text[],
  progress numeric,              -- 0–1 (estimated completion)
  evidence jsonb,                -- references to goals/events/behaviors backing this

  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  UNIQUE (user_id, key)
);

CREATE INDEX IF NOT EXISTS idx_identity_arcs_user
  ON public.identity_arcs (user_id);

-- ============================================
-- NARRATIVE SNAPSHOTS
-- ============================================

CREATE TABLE IF NOT EXISTS public.narrative_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  snapshot_at timestamptz NOT NULL,
  scope text NOT NULL DEFAULT 'weekly',   -- 'daily', 'weekly', 'monthly', 'milestone'
  chapter_id uuid REFERENCES life_chapters(id), -- current chapter
  active_theme_keys text[],
  active_identity_arc_keys text[],
  tensions jsonb,                         -- { "label": "Work vs Rest", "details": "...", "pressure": 0.8 }[]
  opportunities jsonb,                    -- narrative opportunities
  narrative_summary text,                 -- 1–3 paragraphs
  short_logline text,                     -- 1-sentence "episode recap"

  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_narrative_snapshots_user_time
  ON public.narrative_snapshots (user_id, snapshot_at);


