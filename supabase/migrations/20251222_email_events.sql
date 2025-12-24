CREATE TABLE IF NOT EXISTS public.email_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text NOT NULL,
  direction text NOT NULL, -- inbound | outbound
  message_id text,
  thread_id text,
  from_email text,
  to_email text,
  subject text,
  snippet text,
  received_at timestamptz,
  triage_label text,
  triage_confidence numeric,
  triage_payload jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS email_events_user_received_idx
  ON public.email_events (user_id, received_at DESC);

CREATE INDEX IF NOT EXISTS email_events_message_id_idx
  ON public.email_events (message_id);

CREATE INDEX IF NOT EXISTS email_events_thread_id_idx
  ON public.email_events (thread_id);

