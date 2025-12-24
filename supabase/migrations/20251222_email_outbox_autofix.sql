ALTER TABLE IF EXISTS public.email_outbox
  ADD COLUMN IF NOT EXISTS failure_code text,
  ADD COLUMN IF NOT EXISTS auto_fix_suggested boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS auto_fix_payload jsonb;

CREATE INDEX IF NOT EXISTS email_outbox_autofix_idx
  ON public.email_outbox (auto_fix_suggested, failure_code);

