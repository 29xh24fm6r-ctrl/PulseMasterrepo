CREATE TABLE IF NOT EXISTS public.email_suggested_drafts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text NOT NULL,
  source_event_id uuid,
  kind text NOT NULL, -- 'follow_up' | 'reply'
  to_email text NOT NULL,
  subject text NOT NULL,
  body text NOT NULL,
  safe_checksum text NOT NULL,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS email_suggested_drafts_user_active_idx
  ON public.email_suggested_drafts (user_id, active, created_at DESC);

