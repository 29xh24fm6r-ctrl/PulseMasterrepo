alter table pulse_autonomy_classes
  add column display_name text,
  add column description text,
  add column user_paused boolean not null default false,
  add column user_paused_at timestamptz;
