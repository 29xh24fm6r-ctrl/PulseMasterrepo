-- 20251220_canon_run_email.sql
-- One-call auto-fix + assert for email canon

create or replace function public.canon_run_email()
returns jsonb
language plpgsql
as $$
begin
  -- auto-fix first (adds missing columns + required indexes)
  perform public.canon_autofix_email();

  -- then assert (fails hard if any violation remains)
  perform public.canon_assert_email();

  return jsonb_build_object(
    'ok', true,
    'domain', 'email',
    'ran_at', now()
  );
exception
  when others then
    return jsonb_build_object(
      'ok', false,
      'domain', 'email',
      'ran_at', now(),
      'error', sqlerrm
    );
end;
$$;

