-- Performance indexes for tasks table queries
-- These indexes speed up user scoping and deal filtering

-- User scoping (tasks.user_id and tasks.owner_user_id are text)
create index if not exists tasks_user_id_idx on public.tasks (user_id);
create index if not exists tasks_owner_user_id_idx on public.tasks (owner_user_id);

-- Deal filtering (for person-linked tasks)
create index if not exists tasks_deal_id_idx on public.tasks (deal_id);

-- Due date sorting
create index if not exists tasks_due_date_idx on public.tasks (due_date);

