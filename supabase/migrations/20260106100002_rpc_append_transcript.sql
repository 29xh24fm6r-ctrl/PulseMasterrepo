
create or replace function append_call_transcript(p_call_sid text, p_text text)
returns void
language plpgsql
security definer
as $$
begin
  update calls
  set transcript = coalesce(transcript, '') || ' ' || p_text
  where twilio_call_sid = p_call_sid;
end;
$$;
