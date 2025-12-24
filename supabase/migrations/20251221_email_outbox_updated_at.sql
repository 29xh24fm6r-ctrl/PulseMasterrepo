-- Add updated_at column to email_outbox if it doesn't exist
begin;

alter table if exists public.email_outbox
  add column if not exists updated_at timestamptz default now();

-- Create a trigger to auto-update updated_at on row changes
create or replace function update_updated_at_column()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists email_outbox_updated_at_trigger on public.email_outbox;

create trigger email_outbox_updated_at_trigger
  before update on public.email_outbox
  for each row
  execute function update_updated_at_column();

commit;

