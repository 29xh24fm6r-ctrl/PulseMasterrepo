-- ============================================
-- MEMORY CIVILIZATION LAYER
-- Cross-user anonymized patterns
-- ============================================

create table if not exists public.civilization_patterns (
  id uuid primary key default gen_random_uuid(),

  -- Domain and pattern key
  domain text not null,            -- 'focus', 'finance', 'communication', 'relationships', 'career'
  key text not null,               -- 'weekly_review_helps_overwhelm', etc.

  -- Human-readable summary
  title text not null,
  description_md text not null,

  -- JSON structure describing pattern like: 
  -- { "if": {...}, "then": {...}, "confidence": 0.82 }
  pattern jsonb not null,

  -- Aggregated stats (not user-level)
  stats jsonb not null,            -- { "sample_size": 1342, "effect_size": 0.18, ... }

  created_at timestamptz not null default now()
);

create unique index if not exists civilization_patterns_key_unique
  on public.civilization_patterns(domain, key);

create index if not exists civilization_patterns_domain_idx
  on public.civilization_patterns(domain);


