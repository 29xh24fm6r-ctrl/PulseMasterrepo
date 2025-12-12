-- AGI Weekly Review Support
-- Add weekly review fields to agi_runs table

alter table agi_runs
  add column if not exists weekly_review_summary jsonb,
  add column if not exists weekly_review_summary_narrative text;


