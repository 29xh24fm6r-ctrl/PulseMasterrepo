alter table if exists public.reminder_subscriptions
  add column if not exists snooze_count integer not null default 0,
  add column if not exists last_snoozed_at timestamptz;

