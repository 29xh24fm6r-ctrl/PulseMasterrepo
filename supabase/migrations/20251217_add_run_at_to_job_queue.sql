-- 20251217_add_run_at_to_job_queue.sql
-- Adds run_at for compatibility with code/queries that expect it.

alter table public.job_queue
add column if not exists run_at timestamptz;

-- Backfill: if run_at is null, use scheduled_at
update public.job_queue
set run_at = scheduled_at
where run_at is null;

-- Default run_at to scheduled_at-like behavior for new rows
alter table public.job_queue
alter column run_at set default now();

-- Helpful index for workers
create index if not exists job_queue_run_at_status_idx
on public.job_queue (status, run_at);

-- Keep updated_at fresh (if you already have a trigger, skip this)
-- If you already have set_updated_at(), leave as-is.
do $$
begin
  if not exists (
    select 1 from pg_trigger
    where tgname = 'trg_job_queue_set_updated_at'
  ) then
    create trigger trg_job_queue_set_updated_at
    before update on public.job_queue
    for each row execute function public.set_updated_at();
  end if;
end $$;

select pg_notify('pgrst', 'reload schema');

