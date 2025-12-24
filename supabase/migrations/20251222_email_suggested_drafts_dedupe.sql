-- Prevent duplicate active drafts for the same email event + kind per user.
-- Allows historical (inactive) drafts to remain.

create unique index if not exists email_suggested_drafts_active_dedupe
on public.email_suggested_drafts (user_id, source_event_id, kind)
where active = true and source_event_id is not null;

