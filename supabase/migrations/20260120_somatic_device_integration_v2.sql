-- Somatic / Device Integration v2
-- supabase/migrations/20260120_somatic_device_integration_v2.sql

-- ============================================
-- SOMATIC DEVICE SETTINGS
-- ============================================

CREATE TABLE IF NOT EXISTS public.somatic_device_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  phone_integration_enabled boolean NOT NULL DEFAULT false,
  app_usage_enabled boolean NOT NULL DEFAULT false,
  notifications_enabled boolean NOT NULL DEFAULT false,
  location_enabled boolean NOT NULL DEFAULT false,
  wearable_integration_enabled boolean NOT NULL DEFAULT false,
  sleep_data_enabled boolean NOT NULL DEFAULT false,
  heart_data_enabled boolean NOT NULL DEFAULT false,
  steps_data_enabled boolean NOT NULL DEFAULT false,

  last_updated_at timestamptz NOT NULL DEFAULT now(),
  notes text,

  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_somatic_device_settings_user
  ON public.somatic_device_settings (user_id);

-- ============================================
-- SOMATIC RAW DEVICE EVENTS
-- ============================================

CREATE TABLE IF NOT EXISTS public.somatic_raw_device_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  occurred_at timestamptz NOT NULL,
  source text NOT NULL,       -- 'phone', 'wearable', 'system'
  kind text NOT NULL,         -- 'screen_on', 'screen_off', 'app_open', 'notification', 'unlock', 'call', 'text', 'step_chunk', 'sleep_segment', 'hr_sample', etc.

  metadata jsonb,             -- device-specific payload (app name, duration, HR, etc.)

  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_somatic_raw_events_user_time
  ON public.somatic_raw_device_events (user_id, occurred_at);

CREATE INDEX IF NOT EXISTS idx_somatic_raw_events_kind
  ON public.somatic_raw_device_events (user_id, kind, occurred_at);

-- ============================================
-- SOMATIC DAILY METRICS
-- ============================================

CREATE TABLE IF NOT EXISTS public.somatic_daily_metrics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  metrics_date date NOT NULL,

  -- Phone usage
  total_screen_minutes int,
  night_screen_minutes int,           -- e.g. 22:00–04:00
  unlock_count int,
  notification_count int,
  deep_work_disruptions int,          -- interruptions during work blocks

  -- App usage buckets
  focus_app_minutes int,              -- calendar, notes, coding, docs, etc.
  social_app_minutes int,
  entertainment_minutes int,
  messaging_minutes int,
  navigation_minutes int,

  -- Wearable / body data
  sleep_duration_minutes int,
  sleep_efficiency numeric,           -- 0–1
  sleep_quality_score numeric,        -- 0–1 or normalized
  bedtime_local time,
  wake_time_local time,

  resting_heart_rate numeric,
  hr_variability numeric,
  step_count int,
  activity_minutes int,
  sedentary_minutes int,

  -- Derived metrics
  recovery_score numeric,             -- 0–1
  stimulation_score numeric,          -- 0–1 (overstimulation / overload)
  fatigue_score numeric,              -- 0–1
  stress_load_score numeric,          -- 0–1
  circadian_alignment numeric,        -- 0–1 (following their natural rhythm or not)

  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  UNIQUE (user_id, metrics_date)
);

CREATE INDEX IF NOT EXISTS idx_somatic_daily_metrics_user
  ON public.somatic_daily_metrics (user_id, metrics_date);

-- ============================================
-- SOMATIC PATTERNS
-- ============================================

CREATE TABLE IF NOT EXISTS public.somatic_patterns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  last_refreshed_at timestamptz NOT NULL DEFAULT now(),

  chronotype text,                     -- 'early_bird', 'night_owl', 'bimodal', etc.
  best_focus_windows jsonb,            -- e.g. [{ start: '09:00', end: '11:30' }, ...]
  low_energy_windows jsonb,
  social_energy_windows jsonb,         -- when social interactions go better
  crash_patterns jsonb,                -- "if X days of poor sleep then crash on day Y"
  stimulation_sensitivity jsonb,       -- threshold for overload: notifications, screen, etc.
  exercise_effects jsonb,              -- how activity impacts energy/stress next day
  caffeine_like_patterns jsonb,        -- if we infer from app/time-of-day usage (optional)

  summary text,

  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_somatic_patterns_user
  ON public.somatic_patterns (user_id);

-- ============================================
-- SOMATIC ALERTS
-- ============================================

CREATE TABLE IF NOT EXISTS public.somatic_alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  occurred_at timestamptz NOT NULL DEFAULT now(),
  metrics_date date,

  kind text NOT NULL,            -- 'burnout_risk', 'sleep_debt', 'overstimulation', 'under_recovery', 'good_recovery', etc.
  severity numeric NOT NULL,     -- 0..1
  summary text NOT NULL,         -- plain language summary
  recommended_action text,       -- optional suggestion
  context jsonb,                 -- small structured context (scores, etc.)

  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_somatic_alerts_user_time
  ON public.somatic_alerts (user_id, occurred_at);

CREATE INDEX IF NOT EXISTS idx_somatic_alerts_metrics_date
  ON public.somatic_alerts (user_id, metrics_date);


