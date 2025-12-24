create table if not exists public.email_accounts (
  id uuid primary key default gen_random_uuid(),
  user_id text not null,

  provider text not null,                  -- 'google'
  email_address text not null,

  access_token text,
  refresh_token text,
  token_expiry timestamptz,

  gmail_history_id text,
  last_sync_at timestamptz,

  status text not null default 'connected', -- connected | revoked | error
  last_error text,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists email_accounts_user_provider_email_uidx
  on public.email_accounts (user_id, provider, email_address);

create index if not exists email_accounts_user_idx
  on public.email_accounts (user_id, provider);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists trg_email_accounts_updated_at on public.email_accounts;
create trigger trg_email_accounts_updated_at
before update on public.email_accounts
for each row
execute function public.set_updated_at();

