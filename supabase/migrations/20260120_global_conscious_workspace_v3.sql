-- Global Conscious Workspace v3 & Inner Monologue Engine v2
-- supabase/migrations/20260120_global_conscious_workspace_v3.sql

-- ============================================
-- CONSCIOUS FRAMES
-- ============================================

CREATE TABLE IF NOT EXISTS public.conscious_frames (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  created_at timestamptz NOT NULL DEFAULT now(),
  frame_time timestamptz NOT NULL DEFAULT now(),

  trigger_kind text,               -- 'user_message', 'scheduled_loop', 'alert', 'manual_open'
  trigger_source text,             -- 'brainstem_weekly', 'daily_loop', 'simulation', 'social_risk', etc.
  trigger_reference jsonb,         -- arbitrary: { message_id, run_id, subsystem, ... }

  summary text,                    -- short description of "what mind is focusing on"
  dominant_context jsonb,          -- e.g. { domain: 'work', situation: 'deal_x', emotion: 'stressed' }

  overall_urgency numeric,         -- 0..1
  overall_complexity numeric,      -- 0..1
  overall_load numeric             -- 0..1 (how "full" the workspace is)
);

CREATE INDEX IF NOT EXISTS idx_conscious_frames_user_time
  ON public.conscious_frames (user_id, frame_time);

-- ============================================
-- CONSCIOUS ITEMS
-- ============================================

CREATE TABLE IF NOT EXISTS public.conscious_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  frame_id uuid NOT NULL REFERENCES conscious_frames(id) ON DELETE CASCADE,

  created_at timestamptz NOT NULL DEFAULT now(),

  source_subsystem text NOT NULL,         -- 'timeline_coach', 'destiny_engine', 'emotion_os', etc.
  kind text NOT NULL,                     -- 'task', 'risk', 'insight', 'question', 'plan', 'memory', 'social', etc.

  title text NOT NULL,
  description text,

  payload jsonb,                          -- typed data (related IDs, metrics, etc.)

  domain text,                            -- 'work', 'relationships', 'health', 'finance', 'inner_world', etc.
  tags text[],

  attention_score numeric NOT NULL,       -- 0..1, how much attention this deserves *in this frame*
  urgency numeric NOT NULL,               -- 0..1
  importance numeric NOT NULL,            -- 0..1
  emotional_salience numeric NOT NULL,    -- 0..1

  selected boolean NOT NULL DEFAULT false, -- Was this chosen as a focus item for active reasoning?
  resolution_status text NOT NULL DEFAULT 'open',   -- 'open', 'in_progress', 'resolved', 'snoozed'
  resolution_notes text
);

CREATE INDEX IF NOT EXISTS idx_conscious_items_user_frame
  ON public.conscious_items (user_id, frame_id);

CREATE INDEX IF NOT EXISTS idx_conscious_items_user_attention
  ON public.conscious_items (user_id, attention_score DESC);

-- ============================================
-- CONSCIOUS LINKS
-- ============================================

CREATE TABLE IF NOT EXISTS public.conscious_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  created_at timestamptz NOT NULL DEFAULT now(),

  from_item_id uuid NOT NULL REFERENCES conscious_items(id) ON DELETE CASCADE,
  to_item_id uuid NOT NULL REFERENCES conscious_items(id) ON DELETE CASCADE,

  link_type text NOT NULL,                -- 'supports', 'conflicts', 'similar', 'causes', 'is_part_of', etc.
  weight numeric NOT NULL DEFAULT 0.5,    -- 0..1
  notes text
);

CREATE INDEX IF NOT EXISTS idx_conscious_links_user
  ON public.conscious_links (user_id);

CREATE INDEX IF NOT EXISTS idx_conscious_links_from
  ON public.conscious_links (from_item_id);

CREATE INDEX IF NOT EXISTS idx_conscious_links_to
  ON public.conscious_links (to_item_id);

-- ============================================
-- CONSCIOUS CONFLICTS
-- ============================================

CREATE TABLE IF NOT EXISTS public.conscious_conflicts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  created_at timestamptz NOT NULL DEFAULT now(),

  frame_id uuid REFERENCES conscious_frames(id) ON DELETE SET NULL,

  item_a_id uuid REFERENCES conscious_items(id) ON DELETE SET NULL,
  item_b_id uuid REFERENCES conscious_items(id) ON DELETE SET NULL,

  conflict_kind text NOT NULL,           -- 'values_vs_plan', 'destiny_vs_timeline', 'relationship_vs_work', etc.
  severity numeric NOT NULL,             -- 0..1
  description text NOT NULL,             -- human explanation

  suggested_resolutions jsonb            -- structured options
);

CREATE INDEX IF NOT EXISTS idx_conscious_conflicts_user
  ON public.conscious_conflicts (user_id, created_at);

-- ============================================
-- INNER MONOLOGUE TURNS
-- ============================================

CREATE TABLE IF NOT EXISTS public.inner_monologue_turns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  created_at timestamptz NOT NULL DEFAULT now(),

  frame_id uuid REFERENCES conscious_frames(id) ON DELETE SET NULL,
  focus_item_id uuid REFERENCES conscious_items(id) ON DELETE SET NULL,

  step_index int NOT NULL,               -- order within a local chain

  mode text NOT NULL,                    -- 'analysis', 'reflection', 'planning', 'self_check', 'prediction'
  content text NOT NULL,                 -- inner-narration (not necessarily shown 1:1 to user)

  referenced_subsystems text[],          -- which subsystems were consulted
  derived_actions jsonb,                 -- tasks/decisions suggested
  emotional_tone jsonb                   -- { valence, arousal, stance }
);

CREATE INDEX IF NOT EXISTS idx_inner_monologue_user_time
  ON public.inner_monologue_turns (user_id, created_at);

CREATE INDEX IF NOT EXISTS idx_inner_monologue_frame
  ON public.inner_monologue_turns (frame_id);

-- ============================================
-- ATTENTION EVENTS
-- ============================================

CREATE TABLE IF NOT EXISTS public.attention_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  occurred_at timestamptz NOT NULL DEFAULT now(),

  frame_id uuid REFERENCES conscious_frames(id) ON DELETE SET NULL,
  from_item_id uuid REFERENCES conscious_items(id) ON DELETE SET NULL,
  to_item_id uuid REFERENCES conscious_items(id) ON DELETE SET NULL,

  reason text,                          -- 'higher_urgency', 'user_message', 'social_risk', 'simulation_result', etc.
  notes text
);

CREATE INDEX IF NOT EXISTS idx_attention_events_user
  ON public.attention_events (user_id, occurred_at);


