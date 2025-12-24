CREATE TABLE IF NOT EXISTS public.email_sla_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text, -- null = global default rule
  applies_to text NOT NULL, -- needs_reply | request
  warn_after interval NOT NULL,
  urgent_after interval NOT NULL,
  auto_follow_up boolean NOT NULL DEFAULT true,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS email_sla_rules_active_idx
  ON public.email_sla_rules (active, applies_to);

-- Seed defaults (idempotent-ish using a uniqueness hack on values)
INSERT INTO public.email_sla_rules (user_id, applies_to, warn_after, urgent_after, auto_follow_up, active)
SELECT NULL, 'needs_reply', interval '4 hours', interval '24 hours', true, true
WHERE NOT EXISTS (
  SELECT 1 FROM public.email_sla_rules
  WHERE user_id IS NULL AND applies_to='needs_reply' AND warn_after=interval '4 hours' AND urgent_after=interval '24 hours'
);

INSERT INTO public.email_sla_rules (user_id, applies_to, warn_after, urgent_after, auto_follow_up, active)
SELECT NULL, 'request', interval '8 hours', interval '48 hours', true, true
WHERE NOT EXISTS (
  SELECT 1 FROM public.email_sla_rules
  WHERE user_id IS NULL AND applies_to='request' AND warn_after=interval '8 hours' AND urgent_after=interval '48 hours'
);

