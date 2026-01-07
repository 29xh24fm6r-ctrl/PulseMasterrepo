
create table proposed_actions (
  id text primary key,
  user_id uuid references auth.users not null,
  title text not null,
  reasoning text,
  type text not null, -- 'draft_reply', 'schedule_meeting', etc.
  payload jsonb, -- e.g. { draftId: "123" }
  confidence numeric,
  status text default 'pending', -- 'pending', 'approved', 'rejected', 'executed'
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS
alter table proposed_actions enable row level security;

create policy "Users can view their own proposed actions"
  on proposed_actions for select
  using (auth.uid() = user_id);

create policy "Users can update their own proposed actions"
  on proposed_actions for update
  using (auth.uid() = user_id);
