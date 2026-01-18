create table if not exists public.commerce_runs (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null,

  intent text not null,               -- "order_food", "send_flowers"
  request_text text not null,          -- raw user request

  status text not null default 'running'
    check (status in ('running','needs_confirmation','executing','completed','failed')),

  execution_lane text null
    check (execution_lane in ('web','phone','hybrid')),

  chosen_vendor jsonb null,            -- name, url, phone, rating
  estimated_amount_cents integer null,
  final_amount_cents integer null,
  currency text not null default 'usd',

  issuing_card_id text null,
  receipt_id uuid null,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.commerce_runs enable row level security;

create policy "commerce_runs_owner"
on public.commerce_runs
for all
using (owner_user_id = auth.uid())
with check (owner_user_id = auth.uid());
