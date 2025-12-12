-- Emotional Resonance v1
-- supabase/migrations/20260120_emotional_resonance_v1.sql

-- ============================================
-- EMOTION SAMPLES
-- ============================================

CREATE TABLE IF NOT EXISTS public.emotion_samples (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  source text NOT NULL,             -- 'self_report', 'text_sentiment', 'voice_tone', 'physio'
  sampled_at timestamptz NOT NULL DEFAULT now(),
  valence numeric,                  -- -1 (very negative) to 1 (very positive)
  arousal numeric,                  -- 0 (calm) to 1 (highly activated)
  labels text[],                    -- ['stressed', 'focused', 'excited']
  confidence numeric,               -- 0–1
  payload jsonb,                    -- raw data context
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_emotion_samples_user_time
  ON public.emotion_samples (user_id, sampled_at);

-- ============================================
-- EMOTION STATE DAILY
-- ============================================

CREATE TABLE IF NOT EXISTS public.emotion_state_daily (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  state_date date NOT NULL,
  avg_valence numeric,
  avg_arousal numeric,
  dominant_labels text[],
  stress_score numeric,             -- 0–1
  resilience_score numeric,         -- 0–1 (how well user bounced back)
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, state_date)
);

CREATE INDEX IF NOT EXISTS idx_emotion_state_daily_user_date
  ON public.emotion_state_daily (user_id, state_date);

-- ============================================
-- RESPONSE STYLE PROFILES
-- ============================================

CREATE TABLE IF NOT EXISTS public.response_style_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text NOT NULL,             -- 'calm_support', 'hype_coach', 'steady_partner', etc.
  name text NOT NULL,
  description text,
  speaking_style jsonb,          -- structure describing tone, pacing, word choice
  coach_biases jsonb,            -- prefer which coaches/personas
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (key)
);

-- Seed default response styles
INSERT INTO public.response_style_profiles (key, name, description, speaking_style, coach_biases)
VALUES
  (
    'calm_support',
    'Calm Support',
    'Gentle, reassuring, low-pressure. Used when user is stressed or overwhelmed.',
    '{"tone": "warm", "pacing": "slow", "word_choice": "reassuring", "energy": "low"}'::jsonb,
    '{"preferred_coaches": ["confidant", "emotional"]}'::jsonb
  ),
  (
    'hype_coach',
    'Hype Coach',
    'Energetic, encouraging, high tempo. Used when user is positive and motivated.',
    '{"tone": "energetic", "pacing": "fast", "word_choice": "motivational", "energy": "high"}'::jsonb,
    '{"preferred_coaches": ["sales", "career"]}'::jsonb
  ),
  (
    'steady_partner',
    'Steady Partner',
    'Balanced, reliable, consistent. Default for normal states.',
    '{"tone": "neutral", "pacing": "normal", "word_choice": "clear", "energy": "medium"}'::jsonb,
    '{"preferred_coaches": ["all"]}'::jsonb
  ),
  (
    'brutal_honesty',
    'Brutal Honesty',
    'Direct, no-nonsense, calls out patterns. Used carefully, aligned with values.',
    '{"tone": "direct", "pacing": "normal", "word_choice": "straightforward", "energy": "medium"}'::jsonb,
    '{"preferred_coaches": ["career", "strategy"]}'::jsonb
  )
ON CONFLICT (key) DO NOTHING;


