-- Performance indexes for CRM PersonDetail queries
-- These indexes speed up queries for deals, tasks, notes, and health by person

-- Deals by user + primary_contact_id (used in PersonDetail)
create index if not exists crm_deals_user_primary_contact_idx
  on public.crm_deals (user_id, primary_contact_id);

-- Notes/interactions by user + contact_id + type (used in PersonDetail)
create index if not exists crm_interactions_user_contact_type_idx
  on public.crm_interactions (user_id, contact_id, type);

-- Health by user + contact_id (used in PersonDetail)
create index if not exists crm_relationship_health_user_contact_idx
  on public.crm_relationship_health (user_id, contact_id);

-- Tasks (crm_tasks) by owner_user_id + contact_id + status (used in PersonDetail)
create index if not exists crm_tasks_owner_contact_status_idx
  on public.crm_tasks (owner_user_id, contact_id, status);

-- Tasks due_at for sorting
create index if not exists crm_tasks_due_at_idx
  on public.crm_tasks (due_at);

