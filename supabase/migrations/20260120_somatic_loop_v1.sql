-- Somatic Loop v1
-- supabase/migrations/20260120_somatic_loop_v1.sql

-- ============================================
-- SOMATIC SAMPLES
-- ============================================

CREATE TABLE IF NOT EXISTS public.somatic_samples (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  source text NOT NULL,           -- 'manual', 'wearable', 'calendar', 'system'
  sampled_at timestamptz NOT NULL DEFAULT now(),
  metric text NOT NULL,           -- 'sleep_hours', 'step_count', 'restlessness', 'late_screen_time', etc.
  value_numeric numeric,
  value_json jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_somatic_samples_user_time
  ON public.somatic_samples (user_id, sampled_at);

CREATE INDEX IF NOT EXISTS idx_somatic_samples_metric
  ON public.somatic_samples (user_id, metric, sampled_at);

-- ============================================
-- SOMATIC STATE DAILY
-- ============================================

CREATE TABLE IF NOT EXISTS public.somatic_state_daily (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  state_date date NOT NULL,
  sleep_hours numeric,
  sleep_quality numeric,          -- 0–1
  energy_score numeric,           -- 0–1
  fatigue_risk numeric,           -- 0–1
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, state_date)
);

CREATE INDEX IF NOT EXISTS idx_somatic_state_daily_user_date
  ON public.somatic_state_daily (user_id, state_date);


