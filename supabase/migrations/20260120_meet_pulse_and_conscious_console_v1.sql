-- Meet Pulse - Birth Experience v1 & Conscious Console v1
-- supabase/migrations/20260120_meet_pulse_and_conscious_console_v1.sql

-- ============================================
-- PULSE BRAIN PREFERENCES (Per-User Knobs)
-- ============================================

CREATE TABLE IF NOT EXISTS public.pulse_brain_preferences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  presence_level numeric NOT NULL DEFAULT 0.5,      -- 0..1: how often Pulse should show up unprompted
  proactivity_level numeric NOT NULL DEFAULT 0.5,   -- 0..1: how aggressively it suggests changes
  emotional_intensity numeric NOT NULL DEFAULT 0.5, -- 0..1: how warm/expressive vs flat
  depth_of_reflection numeric NOT NULL DEFAULT 0.5, -- 0..1: how deep Pulse goes in reflections with user
  privacy_sensitivity numeric NOT NULL DEFAULT 0.8, -- 0..1: how cautious about surfacing sensitive insights

  allow_autonomous_tweaks boolean NOT NULL DEFAULT true, -- safe, reversible tweaks only
  allow_relationship_feedback boolean NOT NULL DEFAULT true,
  allow_financial_nudges boolean NOT NULL DEFAULT false,
  allow_health_nudges boolean NOT NULL DEFAULT true,

  preferred_voice_profile text,        -- ties into voice_profiles
  preferred_persona_style text,        -- 'jarvis', 'confidant', 'coach', etc.

  ui_mode text NOT NULL DEFAULT 'standard', -- 'standard', 'minimal', 'deep_work'
  notes jsonb
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_pulse_brain_preferences_user
  ON public.pulse_brain_preferences (user_id);

-- ============================================
-- PULSE INTRODUCTION SESSIONS (First-Contact Rituals)
-- ============================================

CREATE TABLE IF NOT EXISTS public.pulse_introduction_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  created_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,

  version text NOT NULL DEFAULT 'v1',
  status text NOT NULL DEFAULT 'in_progress', -- 'in_progress', 'completed', 'abandoned'

  steps_completed jsonb,               -- list of step IDs done
  initial_brain_summary jsonb,         -- snapshot of subsystems at birth
  initial_preferences jsonb,           -- copy of prefs at that moment

  narrative_intro text,                -- the "Hello, I'm Pulse" narrative used
  user_reaction jsonb                  -- high-level sentiment / feedback
);

CREATE INDEX IF NOT EXISTS idx_pulse_introduction_sessions_user
  ON public.pulse_introduction_sessions (user_id, created_at DESC);

-- ============================================
-- PULSE BRAIN SURFACE EVENTS (What Pulse Surfaces)
-- ============================================

CREATE TABLE IF NOT EXISTS public.pulse_brain_surface_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  created_at timestamptz NOT NULL DEFAULT now(),

  source text NOT NULL,                -- 'agi_kernel', 'brain_diagnostics', 'relational_mind', etc.
  origin_id text,                      -- e.g. cognitive_insights.id, relationship_highlights.id, etc.

  category text NOT NULL,              -- 'status', 'risk', 'opportunity', 'reflection', 'celebration'
  title text NOT NULL,
  body text NOT NULL,

  importance numeric NOT NULL,         -- 0..1
  emotional_tone text,                 -- 'calm', 'hype', 'serious', 'gentle', etc.

  delivery_channel text NOT NULL,      -- 'console', 'notification', 'email', 'none'
  delivery_context jsonb,

  dismissed boolean NOT NULL DEFAULT false
);

CREATE INDEX IF NOT EXISTS idx_pulse_brain_surface_events_user
  ON public.pulse_brain_surface_events (user_id, created_at DESC);

-- ============================================
-- PULSE INSIGHT ACKNOWLEDGEMENTS (User Responses)
-- ============================================

CREATE TABLE IF NOT EXISTS public.pulse_insight_acknowledgements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  created_at timestamptz NOT NULL DEFAULT now(),

  surface_event_id uuid REFERENCES pulse_brain_surface_events(id) ON DELETE SET NULL,

  reaction text NOT NULL,              -- 'liked', 'dismissed', 'acted', 'snoozed'
  notes text,
  followup_preferences jsonb           -- e.g. "less of this", "more of these", fine-tuning knobs
);

CREATE INDEX IF NOT EXISTS idx_pulse_insight_acknowledgements_user
  ON public.pulse_insight_acknowledgements (user_id, created_at DESC);


