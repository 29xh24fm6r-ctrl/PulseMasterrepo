begin;

do $$
declare
  jid int;
begin
  -- Only if pg_cron is installed
  if exists (select 1 from pg_extension where extname = 'pg_cron') then

    -- Find existing job (if any)
    select jobid into jid
    from cron.job
    where jobname = 'pulse_rollup_refresh_15m'
    limit 1;

    -- Unschedule only if it exists
    if jid is not null then
      perform cron.unschedule(jid);
    end if;

    -- Schedule the refresh
    perform cron.schedule(
      'pulse_rollup_refresh_15m',
      '*/15 * * * *',
      'select public.user_daily_activity_rollup_refresh();'
    );

  end if;

exception
  when undefined_table then
    -- cron.job not visible in this environment; ignore safely
    null;
  when undefined_function then
    -- cron functions/signature differ; ignore safely
    null;
end $$;

commit;
