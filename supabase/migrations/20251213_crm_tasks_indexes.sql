-- Performance indexes for crm_tasks queries
-- These indexes speed up queries by owner_user_id, contact_id, and status

-- Composite index for owner + contact + status (most common query pattern)
create index if not exists crm_tasks_owner_contact_status_idx
  on public.crm_tasks (owner_user_id, contact_id, status);

-- Index for owner + deal_id (for filtering tasks by deal)
create index if not exists crm_tasks_owner_deal_idx
  on public.crm_tasks (owner_user_id, deal_id);

-- Index for due_at sorting
create index if not exists crm_tasks_due_at_idx
  on public.crm_tasks (due_at);

