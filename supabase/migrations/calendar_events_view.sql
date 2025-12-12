-- Calendar Events View Fix
-- Creates a view that proxies calendar_events_cache so existing code works

create or replace view public.calendar_events as
select *
from public.calendar_events_cache;

