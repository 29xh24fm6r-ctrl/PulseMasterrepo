-- Destiny Engine v1
-- supabase/migrations/20260120_destiny_engine_v1.sql

-- ============================================
-- DESTINY BLUEPRINTS
-- ============================================

CREATE TABLE IF NOT EXISTS public.destiny_blueprints (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  key text NOT NULL,                      -- 'legendary_builder_banker', 'master_family_pillar', etc.
  name text NOT NULL,                     -- user-facing label
  tagline text,                           -- one-line statement

  horizon_years int NOT NULL,             -- 3-10 typical
  description text,                       -- richer overview

  identity_themes jsonb,                  -- { roles, virtues, narrative_motifs }
  domain_targets jsonb,                   -- { work: {...}, relationships: {...}, health: {...}, finance: {...}, self: {...} }
  non_negotiables jsonb,                  -- lines that cannot be crossed in service of this destiny
  tradeoff_philosophy jsonb,              -- "What this destiny is willing to trade / not trade"

  is_archived boolean NOT NULL DEFAULT false,
  is_primary boolean NOT NULL DEFAULT false
);

CREATE INDEX IF NOT EXISTS idx_destiny_blueprints_user
  ON public.destiny_blueprints (user_id);

CREATE INDEX IF NOT EXISTS idx_destiny_blueprints_primary
  ON public.destiny_blueprints (user_id, is_primary)
  WHERE is_primary = true;

-- ============================================
-- DESTINY ARCS
-- ============================================

CREATE TABLE IF NOT EXISTS public.destiny_arcs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  blueprint_id uuid NOT NULL REFERENCES destiny_blueprints(id) ON DELETE CASCADE,

  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  name text NOT NULL,                      -- '12-Month Ascension Arc', 'Relationship Repair + Foundation'
  logline text,                            -- 1–2 sentence story of this arc

  arc_start date NOT NULL,
  arc_end date NOT NULL,

  focus_domains jsonb,                     -- which domains are front-and-center
  guiding_principles jsonb,                -- 3–7 principles for this arc

  status text NOT NULL DEFAULT 'active',   -- 'active', 'completed', 'abandoned'

  is_current boolean NOT NULL DEFAULT false
);

CREATE INDEX IF NOT EXISTS idx_destiny_arcs_user
  ON public.destiny_arcs (user_id, created_at);

CREATE INDEX IF NOT EXISTS idx_destiny_arcs_current
  ON public.destiny_arcs (user_id, is_current)
  WHERE is_current = true;

-- ============================================
-- DESTINY CHECKPOINTS
-- ============================================

CREATE TABLE IF NOT EXISTS public.destiny_checkpoints (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  arc_id uuid NOT NULL REFERENCES destiny_arcs(id) ON DELETE CASCADE,

  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  label text NOT NULL,                    -- 'Ship Pulse V1', 'Debt-Free Milestone', 'Marriage Stability Threshold'
  description text,

  target_date date,
  domain text,                            -- 'work', 'relationships', 'health', etc.
  metrics jsonb,                          -- optional: KPIs / qualitative markers

  importance numeric NOT NULL DEFAULT 0.7,  -- 0..1
  status text NOT NULL DEFAULT 'planned',   -- 'planned', 'in_progress', 'reached', 'missed', 'changed'

  reached_at timestamptz,
  missed_at timestamptz
);

CREATE INDEX IF NOT EXISTS idx_destiny_checkpoints_user
  ON public.destiny_checkpoints (user_id, target_date);

CREATE INDEX IF NOT EXISTS idx_destiny_checkpoints_arc
  ON public.destiny_checkpoints (arc_id);

-- ============================================
-- DESTINY ALIGNMENT LOG
-- ============================================

CREATE TABLE IF NOT EXISTS public.destiny_alignment_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  arc_id uuid REFERENCES destiny_arcs(id) ON DELETE SET NULL,

  evaluated_at timestamptz NOT NULL DEFAULT now(),

  alignment_overall numeric NOT NULL,      -- 0..1
  alignment_by_domain jsonb,               -- { work: 0.8, relationships: 0.6, health: 0.4, ... }
  narrative_consistency numeric,           -- 0..1: does current chapter fit the arc?
  tension_notes jsonb,                     -- tensions between lived life and declared destiny
  course_correction_suggestions jsonb      -- suggestions for small changes
);

CREATE INDEX IF NOT EXISTS idx_destiny_alignment_user
  ON public.destiny_alignment_log (user_id, evaluated_at);


