-- PULSE MEMORY INDICES: 20260114_memory_stratification.sql

-- 1. Add Layer and Meta columns
alter table memories 
add column if not exists layer text not null default 'M2_ShortTerm' check (layer in ('M1_Context', 'M2_ShortTerm', 'M3_LongTerm', 'M4_Identity', 'M5_Core')),
add column if not exists meta jsonb not null default '{}';

-- 2. Index for Layer-based retrieval (Critical for Context Building)
create index if not exists idx_memories_layer_created on memories(owner_user_id, layer, created_at desc);

-- 3. Index for Importance within Layers (For retrieving "Core" memories)
create index if not exists idx_memories_layer_importance on memories(owner_user_id, layer, importance desc);
