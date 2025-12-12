-- Pulse Presence & Notification Orchestrator v2
-- supabase/migrations/20260120_pulse_presence_and_notification_orchestrator_v2.sql

-- ============================================
-- PRESENCE EVENTS (Candidate Events That Could Be Surfaced)
-- ============================================

CREATE TABLE IF NOT EXISTS public.presence_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  created_at timestamptz NOT NULL DEFAULT now(),

  source text NOT NULL,               -- 'agi_kernel', 'coach', 'calendar', 'finance', etc.
  origin_id text,                     -- optional ID from source table

  kind text NOT NULL,                 -- 'insight', 'reminder', 'risk_alert', 'opportunity', 'nudge', 'status'
  title text NOT NULL,
  body text NOT NULL,

  importance numeric NOT NULL,        -- 0..1
  urgency numeric NOT NULL,           -- 0..1 (time sensitivity)
  domain text,                        -- 'work', 'relationships', 'health', 'finance', 'meta'

  suggested_channel text,             -- caller's suggestion: 'console', 'notification', 'email', 'voice', 'none'
  suggested_time_window jsonb,        -- e.g. { from: ts, to: ts, preferred: ts }

  context jsonb,                      -- { relatedEntities, calendarContext, relationshipContext, etc. }

  consumed boolean NOT NULL DEFAULT false
);

CREATE INDEX IF NOT EXISTS idx_presence_events_user_time
  ON public.presence_events (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_presence_events_consumed
  ON public.presence_events (user_id, consumed);

-- ============================================
-- PRESENCE DECISIONS (Orchestrator's Decision Log)
-- ============================================

CREATE TABLE IF NOT EXISTS public.presence_decisions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  presence_event_id uuid NOT NULL REFERENCES presence_events(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  created_at timestamptz NOT NULL DEFAULT now(),

  decision text NOT NULL,             -- 'send_now', 'schedule', 'bundle', 'suppress'
  chosen_channel text,                -- 'console', 'notification', 'email', 'voice', 'none'
  scheduled_for timestamptz,

  rationale jsonb,                    -- explanation / factors considered
  state_snapshot jsonb,               -- emotion/somatic/prefs/time-of-day snippet

  executed boolean NOT NULL DEFAULT false,
  executed_at timestamptz,
  execution_error text
);

CREATE INDEX IF NOT EXISTS idx_presence_decisions_user_time
  ON public.presence_decisions (user_id, created_at DESC);

-- ============================================
-- PRESENCE DAILY SUMMARIES (Per-Day Aggregation)
-- ============================================

CREATE TABLE IF NOT EXISTS public.presence_daily_summaries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  summary_date date NOT NULL,

  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  events_generated integer NOT NULL DEFAULT 0,
  events_surfaced integer NOT NULL DEFAULT 0,
  notifications_sent integer NOT NULL DEFAULT 0,
  emails_sent integer NOT NULL DEFAULT 0,

  user_ack_liked integer NOT NULL DEFAULT 0,
  user_ack_dismissed integer NOT NULL DEFAULT 0,
  user_ack_acted integer NOT NULL DEFAULT 0,
  user_ack_snoozed integer NOT NULL DEFAULT 0,

  presence_level_effective numeric,   -- observed presence after tuning
  notes jsonb
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_presence_daily_summaries_user_date
  ON public.presence_daily_summaries (user_id, summary_date);


