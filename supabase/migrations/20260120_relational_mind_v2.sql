-- Relational Mind v2: Theory of Mind, Social Graph Intelligence & Empathic Resonance
-- supabase/migrations/20260120_relational_mind_v2.sql

-- ============================================
-- RELATIONAL IDENTITIES (Theory of Mind Profiles)
-- ============================================

CREATE TABLE IF NOT EXISTS public.relational_identities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  contact_id uuid,                     -- link to contacts/CRM if exists
  external_ref text,                   -- email/phone/handle, or CRM ID fallback

  display_name text NOT NULL,
  role text,                           -- 'spouse', 'child', 'boss', 'client', 'friend', etc.
  domain text,                         -- 'family', 'work', 'bank_client', 'vendor', etc.

  importance numeric NOT NULL DEFAULT 0.5,  -- 0..1
  closeness numeric NOT NULL DEFAULT 0.5,   -- perceived emotional closeness
  influence numeric NOT NULL DEFAULT 0.5,   -- how much they influence user's life

  core_traits jsonb,                   -- e.g. { big5, attachment_style, conflict_style }
  values_profile jsonb,                -- what they seem to value (stability, honesty, speed, etc.)
  preferences jsonb,                   -- communication prefs, logistics, topics
  sensitivities jsonb,                 -- triggers / friction points
  motivations jsonb,                   -- what drives them

  model_confidence numeric NOT NULL DEFAULT 0.5, -- how confident Pulse is in this model (0..1)

  last_interaction_at timestamptz,
  last_model_update_at timestamptz
);

CREATE INDEX IF NOT EXISTS idx_relational_identities_user
  ON public.relational_identities (user_id, importance DESC);

CREATE INDEX IF NOT EXISTS idx_relational_identities_contact
  ON public.relational_identities (user_id, contact_id);

-- ============================================
-- RELATIONAL STATE SNAPSHOTS (Time-Varying State)
-- ============================================

CREATE TABLE IF NOT EXISTS public.relational_state_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  relational_identity_id uuid NOT NULL REFERENCES relational_identities(id) ON DELETE CASCADE,

  snapshot_time timestamptz NOT NULL DEFAULT now(),

  relationship_health numeric,        -- 0..1 overall health
  trust_level numeric,                -- 0..1
  tension_level numeric,              -- 0..1
  connection_frequency numeric,       -- normalized contact frequency
  reciprocity_score numeric,          -- 0..1 (are interactions balanced)

  current_mode text,                  -- 'support', 'repair', 'growth', 'stable', 'fragile', etc.
  recent_events jsonb,                -- compressed summary of last interactions

  perceived_other_state jsonb,        -- ToM: { mood, stress, goals, concerns }
  risk_flags jsonb,                   -- warnings (e.g., 'potential_neglect', 'recent_conflict')
  opportunity_flags jsonb             -- good opportunities to lean in
);

CREATE INDEX IF NOT EXISTS idx_relational_state_snapshots_user_time
  ON public.relational_state_snapshots (user_id, snapshot_time DESC);

CREATE INDEX IF NOT EXISTS idx_relational_state_snapshots_identity
  ON public.relational_state_snapshots (relational_identity_id, snapshot_time DESC);

-- ============================================
-- RELATIONAL PREDICTIONS (Theory of Mind Predictions)
-- ============================================

CREATE TABLE IF NOT EXISTS public.relational_predictions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  relational_identity_id uuid NOT NULL REFERENCES relational_identities(id) ON DELETE CASCADE,

  created_at timestamptz NOT NULL DEFAULT now(),

  context jsonb,                      -- description of situation (message, decision, event)
  horizon text,                       -- 'immediate', 'short_term', 'long_term'

  predicted_reaction jsonb,           -- { emotion, behavior, likely_response }
  predicted_effect_on_relationship jsonb, -- { delta_trust, delta_tension, delta_health }

  confidence numeric,                 -- 0..1
  recommendation jsonb                -- alternative phrasing/behavior suggestions
);

CREATE INDEX IF NOT EXISTS idx_relational_predictions_identity
  ON public.relational_predictions (relational_identity_id, created_at DESC);

-- ============================================
-- RELATIONSHIP HIGHLIGHTS (Summaries & Insights)
-- ============================================

CREATE TABLE IF NOT EXISTS public.relationship_highlights (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  created_at timestamptz NOT NULL DEFAULT now(),

  relational_identity_id uuid REFERENCES relational_identities(id) ON DELETE SET NULL,

  kind text NOT NULL,                 -- 'win', 'risk', 'pattern', 'tension', 'opportunity'
  label text NOT NULL,
  description text NOT NULL,
  importance numeric NOT NULL,        -- 0..1

  suggested_action jsonb              -- suggested next move(s)
);

CREATE INDEX IF NOT EXISTS idx_relationship_highlights_user
  ON public.relationship_highlights (user_id, created_at DESC);

-- ============================================
-- EMPATHIC EVENTS (Log of Empathic Responses)
-- ============================================

CREATE TABLE IF NOT EXISTS public.empathic_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  created_at timestamptz NOT NULL DEFAULT now(),

  source text NOT NULL,               -- 'conversation', 'notification', 'coach', etc.
  context jsonb,                      -- { threadId, contactId, channel, etc. }

  detected_user_state jsonb,          -- from Emotion OS + Somatic
  detected_other_state jsonb,         -- from ToM / relational_state

  chosen_style jsonb,                 -- { tone, pace, warmth, directness }
  suggested_message jsonb,            -- optional: { phrasing, channel, timing }

  outcome jsonb                       -- optional: later evaluation (did it help?)
);

CREATE INDEX IF NOT EXISTS idx_empathic_events_user
  ON public.empathic_events (user_id, created_at DESC);


