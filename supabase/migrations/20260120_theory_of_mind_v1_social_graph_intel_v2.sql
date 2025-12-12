-- Theory of Mind Engine v1 & Social Graph Intelligence v2
-- supabase/migrations/20260120_theory_of_mind_v1_social_graph_intel_v2.sql

-- ============================================
-- SOCIAL ENTITIES
-- ============================================

CREATE TABLE IF NOT EXISTS public.social_entities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  source text,                   -- 'contacts', 'crm', 'email', 'manual', etc.
  external_id text,              -- contact_id / crm_id / email address hash, etc.

  kind text NOT NULL,            -- 'person', 'organization'
  display_name text NOT NULL,
  role_label text,               -- 'spouse', 'child', 'boss', 'client', 'friend', etc.

  importance numeric,            -- 0..1 to user
  tags text[],                   -- ['family', 'work', 'vip', 'high_tension']

  last_interaction_at timestamptz,
  interaction_summary jsonb      -- optional cached stats
);

CREATE INDEX IF NOT EXISTS idx_social_entities_user
  ON public.social_entities (user_id);

CREATE INDEX IF NOT EXISTS idx_social_entities_source_external
  ON public.social_entities (user_id, source, external_id)
  WHERE external_id IS NOT NULL;

-- ============================================
-- SOCIAL EDGES
-- ============================================

CREATE TABLE IF NOT EXISTS public.social_edges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  from_entity_id uuid NOT NULL REFERENCES social_entities(id) ON DELETE CASCADE,
  to_entity_id uuid NOT NULL REFERENCES social_entities(id) ON DELETE CASCADE,

  relationship_type text,        -- 'spouse', 'child', 'boss', 'colleague', 'client', 'friend'
  direction text,                -- 'outbound', 'inbound', 'mutual'

  closeness numeric,             -- 0..1
  trust numeric,                 -- 0..1
  tension numeric,               -- 0..1
  drift numeric,                 -- 0..1 (how neglected / distant recently)
  supportiveness numeric,        -- 0..1

  last_updated_reason text,
  metrics jsonb                  -- aggregated stats (last_contact_days, msgs_per_week, etc.)
);

CREATE INDEX IF NOT EXISTS idx_social_edges_user
  ON public.social_edges (user_id);

CREATE INDEX IF NOT EXISTS idx_social_edges_from
  ON public.social_edges (from_entity_id);

CREATE INDEX IF NOT EXISTS idx_social_edges_to
  ON public.social_edges (to_entity_id);

CREATE UNIQUE INDEX IF NOT EXISTS idx_social_edges_unique
  ON public.social_edges (user_id, from_entity_id, to_entity_id);

-- ============================================
-- THEORY OF MIND PROFILES
-- ============================================

CREATE TABLE IF NOT EXISTS public.theory_of_mind_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  entity_id uuid NOT NULL REFERENCES social_entities(id) ON DELETE CASCADE,

  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  core_traits jsonb,             -- personality-ish: { conscientious: 0.7, sensitive: 0.9, etc. }
  motivational_drivers jsonb,    -- values/desires: { security: high, recognition: medium, autonomy: high }
  stress_triggers jsonb,         -- situations that tend to upset them
  soothing_patterns jsonb,       -- what calms / reassures them
  conflict_patterns jsonb,       -- how conflict tends to play out
  communication_style jsonb,     -- preferences: direct/indirect, time-of-day, channel
  current_state_hypothesis jsonb,-- { mood: 'stressed', overburdened: true, etc. }

  summary text                   -- 2–4 sentence ToM summary
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_tom_profile_user_entity
  ON public.theory_of_mind_profiles (user_id, entity_id);

-- ============================================
-- SOCIAL STATE SNAPSHOTS
-- ============================================

CREATE TABLE IF NOT EXISTS public.social_state_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  snapshot_date date NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),

  overall_health numeric,        -- 0..1
  overall_tension numeric,       -- 0..1
  overall_drift numeric,         -- 0..1 (neglect)
  overall_support numeric,       -- 0..1

  key_issues jsonb,              -- [{ entityId, label, severity, notes }]
  key_opportunities jsonb,       -- [{ entityId, label, leverage, notes }]
  narrative_summary text         -- "This season your relationships look like..."
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_social_state_snapshots_user_date
  ON public.social_state_snapshots (user_id, snapshot_date);

-- ============================================
-- SOCIAL RISK EVENTS
-- ============================================

CREATE TABLE IF NOT EXISTS public.social_risk_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  created_at timestamptz NOT NULL DEFAULT now(),

  entity_id uuid REFERENCES social_entities(id) ON DELETE SET NULL,
  edge_id uuid REFERENCES social_edges(id) ON DELETE SET NULL,

  risk_kind text NOT NULL,        -- 'looming_conflict', 'resentment_building', 'drift_risk', 'burnout_on_their_side'
  severity numeric NOT NULL,      -- 0..1
  timeframe text,                 -- 'short_term', 'this_month', 'this_quarter'

  summary text NOT NULL,          -- "If this keeps going, they may feel..."
  context jsonb,
  resolved_at timestamptz
);

CREATE INDEX IF NOT EXISTS idx_social_risk_events_user
  ON public.social_risk_events (user_id, created_at);

CREATE INDEX IF NOT EXISTS idx_social_risk_events_unresolved
  ON public.social_risk_events (user_id, resolved_at)
  WHERE resolved_at IS NULL;

-- ============================================
-- SOCIAL RECOMMENDATIONS
-- ============================================

CREATE TABLE IF NOT EXISTS public.social_recommendations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  created_at timestamptz NOT NULL DEFAULT now(),
  recommended_for_date date,

  entity_id uuid REFERENCES social_entities(id) ON DELETE SET NULL,
  edge_id uuid REFERENCES social_edges(id) ON DELETE SET NULL,

  kind text NOT NULL,             -- 'checkin', 'repair', 'celebrate', 'support', 'boundary'
  label text NOT NULL,
  suggestion text NOT NULL,       -- what Pulse recommends you actually do/say
  priority numeric NOT NULL,      -- 0..1
  domain text,                    -- 'family', 'work', 'friends', 'clients'

  status text NOT NULL DEFAULT 'pending',  -- 'pending', 'done', 'skipped'
  completed_at timestamptz,
  user_feedback jsonb             -- { helpful: true/false, notes: "" }
);

CREATE INDEX IF NOT EXISTS idx_social_recommendations_user
  ON public.social_recommendations (user_id, recommended_for_date);

CREATE INDEX IF NOT EXISTS idx_social_recommendations_pending
  ON public.social_recommendations (user_id, status)
  WHERE status = 'pending';


