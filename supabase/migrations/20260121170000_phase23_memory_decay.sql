alter table pulse_autonomy_classes
  add column last_success_at timestamptz,
  add column last_confirm_at timestamptz,
  add column last_decay_at timestamptz,
  add column decay_score numeric not null default 0,
  add column context_hash text;
