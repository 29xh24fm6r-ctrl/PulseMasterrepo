-- Create the life_state table
create table "public"."life_state" (
    "id" uuid not null default gen_random_uuid(),
    "user_id" uuid not null references auth.users(id) on delete cascade,
    "user_id_uuid" uuid not null references auth.users(id) on delete cascade,
    "captured_at" timestamp with time zone not null default now(),
    "momentum_score" integer not null default 0,
    "energy_level" integer not null default 50,
    "financial_pressure" double precision not null default 0.0,
    "time_pressure" double precision not null default 0.0,
    "stress_index" double precision not null default 0.0,
    "confidence_level" integer not null default 50,
    "risk_vectors" jsonb default '[]'::jsonb,
    "opportunity_vectors" jsonb default '[]'::jsonb,
    "raw_signals" jsonb default '{}'::jsonb,
    "metadata" jsonb default '{}'::jsonb,

    constraint "life_state_pkey" primary key ("id")
);

-- Index for querying history
create index "life_state_user_id_captured_at_idx" on "public"."life_state" ("user_id", "captured_at" desc);
create index "life_state_user_id_uuid_captured_at_idx" on "public"."life_state" ("user_id_uuid", "captured_at" desc);

-- RLS Policies
alter table "public"."life_state" enable row level security;

create policy "Users can view their own life state"
on "public"."life_state"
as permissive
for select
to authenticated
using (auth.uid() = user_id);

create policy "Users can insert their own life state"
on "public"."life_state"
as permissive
for insert
to authenticated
with check (auth.uid() = user_id);

-- Function to snapshot latest state (for easy access to 'current')
create or replace view "public"."current_life_state" as
select distinct on (user_id) *
from "public"."life_state"
order by user_id, captured_at desc;

-- Grant permissions
grant select, insert on table "public"."life_state" to authenticated;
grant select on table "public"."life_state" to service_role;
grant select on table "public"."current_life_state" to authenticated;
grant select on table "public"."current_life_state" to service_role;
