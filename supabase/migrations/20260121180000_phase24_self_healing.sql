
-- Phase 24: Self-Healing & Auto-Degradation
-- Adds health tracking state to autonomy classes

alter table pulse_autonomy_classes
  add column health_state text not null default 'healthy', -- healthy | degraded | locked
  add column last_degraded_at timestamptz,
  add column last_locked_at timestamptz,
  add column recovery_attempts int not null default 0;

-- Optional: Index on health_state for fast queries of broken routines
create index if not exists idx_pulse_autonomy_classes_health on pulse_autonomy_classes(health_state);
