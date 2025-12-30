-- Migration: Add context JSONB to contacts for Second Brain intelligence
-- Date: 2025-12-26

alter table public.contacts 
add column if not exists context jsonb default '{}'::jsonb;

comment on column public.contacts.context is 'Flexible storage for AI intelligence: communication style, pain points, goals, etc.';
