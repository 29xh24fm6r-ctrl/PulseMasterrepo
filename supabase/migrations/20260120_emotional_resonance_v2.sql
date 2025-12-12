-- Emotional Mirroring & Empathic Resonance v2
-- supabase/migrations/20260120_emotional_resonance_v2.sql

-- ============================================
-- EMOTION STYLE PROFILE
-- ============================================

CREATE TABLE IF NOT EXISTS public.emotion_style_profile (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  baseline_style jsonb,           -- general: { directness, humor, profanity_ok, formality, length_preference, etc. }
  crisis_style jsonb,             -- preferred style when highly distressed
  hype_style jsonb,               -- when user wants to push / be pushed
  reflective_style jsonb,         -- when user is contemplative

  emotion_to_style_map jsonb,     -- mapping from emotional clusters -> style config
                                  -- e.g. { "overwhelm": { calm, short, directive }, "bored": { playful, slightly provocative } }

  persona_preferences jsonb,      -- which coach/persona archetypes they prefer in which emotional states
                                  -- e.g. { "sales": "hype_coach", "relationship_conflict": "confidant", ... }

  boundaries jsonb,               -- topics/styles to avoid; "never do X when I am Y"
  summary text                    -- verbal description of "how to talk to me"
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_emotion_style_profile_user
  ON public.emotion_style_profile (user_id);

-- ============================================
-- EMOTION CHANNEL SETTINGS
-- ============================================

CREATE TABLE IF NOT EXISTS public.emotion_channel_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  channel text NOT NULL,          -- 'voice', 'chat', 'notification', 'email'
  context text,                   -- 'work', 'home', 'driving', 'morning_routine', etc.

  tone_preferences jsonb,         -- { calm: 0.9, hype: 0.3, blunt: 0.2, playful: 0.7 }
  length_preferences jsonb,       -- { short: 0.8, medium: 0.4, long: 0.2 }
  interruption_rules jsonb,       -- when it's okay to interrupt via this channel
  sensitivity_rules jsonb         -- e.g. "no heavy topics via notifications at night"
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_emotion_channel_settings_user_channel
  ON public.emotion_channel_settings (user_id, channel, context);

-- ============================================
-- EMOTION INTERACTION LOG
-- ============================================

CREATE TABLE IF NOT EXISTS public.emotion_interaction_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  occurred_at timestamptz NOT NULL DEFAULT now(),

  channel text NOT NULL,          -- 'chat', 'voice', 'notification', etc.
  context text,                   -- high-level (work_during_day, late_night_rumination, etc.)

  input_emotion_state jsonb,      -- Emotion OS snapshot before response
  input_somatic_state jsonb,      -- Somatic snapshot before response

  response_style jsonb,           -- what Pulse chose: { tone, persona, length, stance }
  intervention_kind text,         -- 'grounding', 'reframe', 'hype', 'plan', 'validation', etc.

  outcome_emotion_state jsonb,    -- Emotion OS snapshot after some time-window
  user_feedback jsonb,            -- explicit rating + tags if user responded
  resonance_score numeric         -- 0..1 derived from emotion change + feedback
);

CREATE INDEX IF NOT EXISTS idx_emotion_interaction_log_user_time
  ON public.emotion_interaction_log (user_id, occurred_at);

-- ============================================
-- EMOTION RESONANCE EVENTS
-- ============================================

CREATE TABLE IF NOT EXISTS public.emotion_resonance_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  created_at timestamptz NOT NULL DEFAULT now(),

  interaction_id uuid REFERENCES emotion_interaction_log(id) ON DELETE SET NULL,

  direction text NOT NULL,        -- 'positive', 'negative', 'neutral'
  magnitude numeric NOT NULL,     -- 0..1

  summary text NOT NULL,          -- "This style of response really helped when you were overwhelmed"
  pattern_tags jsonb              -- tags to feed back into the style_profile/meta-learning
);

CREATE INDEX IF NOT EXISTS idx_emotion_resonance_events_user
  ON public.emotion_resonance_events (user_id, created_at);


