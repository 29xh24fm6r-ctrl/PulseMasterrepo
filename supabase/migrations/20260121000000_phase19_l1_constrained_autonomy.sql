-- Create pulse_autonomy_classes table
create table pulse_autonomy_classes (
  id uuid primary key default gen_random_uuid(),

  owner_user_id uuid not null,

  class_key text not null, -- domain:effect_type:fingerprint
  domain text not null,
  effect_type text not null,
  fingerprint text not null,

  status text not null, -- 'locked' | 'eligible' | 'paused'
  eligibility_score numeric not null default 0 check (eligibility_score >= 0 and eligibility_score <= 1),

  successes int not null default 0,
  confirmations int not null default 0,
  rejections int not null default 0,
  reverts int not null default 0,
  confusion_events int not null default 0,
  ipp_blocks int not null default 0,

  last_effect_id uuid,
  last_decision_at timestamptz,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  unique (owner_user_id, class_key)
);

create index on pulse_autonomy_classes (owner_user_id);
create index on pulse_autonomy_classes (status);
create index on pulse_autonomy_classes (domain);

-- Extend pulse_effects table
alter table pulse_effects
  add column autonomy_level text not null default 'L0',
  add column autonomy_class_key text,
  add column decision_reason text;
