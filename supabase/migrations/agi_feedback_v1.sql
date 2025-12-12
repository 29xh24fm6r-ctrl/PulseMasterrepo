-- AGI Feedback System v1
-- supabase/migrations/agi_feedback_v1.sql

create table if not exists agi_feedback (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  action_id uuid not null references agi_actions(id) on delete cascade,
  feedback_type text not null, -- 'accepted' | 'modified' | 'rejected'
  comment text,
  created_at timestamptz not null default now()
);

create index if not exists agi_feedback_user_id_idx on agi_feedback(user_id);
create index if not exists agi_feedback_action_id_idx on agi_feedback(action_id);
create index if not exists agi_feedback_type_idx on agi_feedback(feedback_type);



