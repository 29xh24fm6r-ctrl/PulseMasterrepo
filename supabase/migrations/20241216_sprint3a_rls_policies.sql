-- Sprint 3A: Update RLS Policies to use current_user_row_id()
-- Part 3: Bulletproof RLS policies
-- supabase/migrations/20241216_sprint3a_rls_policies.sql

-- ============================================
-- RLS POLICIES FOR APP TABLES
-- ============================================

-- Enable RLS on all app tables
ALTER TABLE public.crm_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.deals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.habits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.habit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.journal_entries ENABLE ROW LEVEL SECURITY;

-- ============================================
-- CRM CONTACTS
-- ============================================

-- Drop old policies if they exist
DROP POLICY IF EXISTS "Users can view own contacts" ON public.crm_contacts;
DROP POLICY IF EXISTS "Users can insert own contacts" ON public.crm_contacts;
DROP POLICY IF EXISTS "Users can update own contacts" ON public.crm_contacts;
DROP POLICY IF EXISTS "Users can delete own contacts" ON public.crm_contacts;

-- New policies using current_user_row_id()
CREATE POLICY "Users can view own contacts"
  ON public.crm_contacts FOR SELECT
  USING (user_id = public.current_user_row_id());

CREATE POLICY "Users can insert own contacts"
  ON public.crm_contacts FOR INSERT
  WITH CHECK (user_id = public.current_user_row_id());

CREATE POLICY "Users can update own contacts"
  ON public.crm_contacts FOR UPDATE
  USING (user_id = public.current_user_row_id())
  WITH CHECK (user_id = public.current_user_row_id());

CREATE POLICY "Users can delete own contacts"
  ON public.crm_contacts FOR DELETE
  USING (user_id = public.current_user_row_id());

-- ============================================
-- TASKS
-- ============================================

DROP POLICY IF EXISTS "Users can view own tasks" ON public.tasks;
DROP POLICY IF EXISTS "Users can insert own tasks" ON public.tasks;
DROP POLICY IF EXISTS "Users can update own tasks" ON public.tasks;
DROP POLICY IF EXISTS "Users can delete own tasks" ON public.tasks;

CREATE POLICY "Users can view own tasks"
  ON public.tasks FOR SELECT
  USING (user_id = public.current_user_row_id());

CREATE POLICY "Users can insert own tasks"
  ON public.tasks FOR INSERT
  WITH CHECK (user_id = public.current_user_row_id());

CREATE POLICY "Users can update own tasks"
  ON public.tasks FOR UPDATE
  USING (user_id = public.current_user_row_id())
  WITH CHECK (user_id = public.current_user_row_id());

CREATE POLICY "Users can delete own tasks"
  ON public.tasks FOR DELETE
  USING (user_id = public.current_user_row_id());

-- ============================================
-- DEALS
-- ============================================

DROP POLICY IF EXISTS "Users can view own deals" ON public.deals;
DROP POLICY IF EXISTS "Users can insert own deals" ON public.deals;
DROP POLICY IF EXISTS "Users can update own deals" ON public.deals;
DROP POLICY IF EXISTS "Users can delete own deals" ON public.deals;

CREATE POLICY "Users can view own deals"
  ON public.deals FOR SELECT
  USING (user_id = public.current_user_row_id());

CREATE POLICY "Users can insert own deals"
  ON public.deals FOR INSERT
  WITH CHECK (user_id = public.current_user_row_id());

CREATE POLICY "Users can update own deals"
  ON public.deals FOR UPDATE
  USING (user_id = public.current_user_row_id())
  WITH CHECK (user_id = public.current_user_row_id());

CREATE POLICY "Users can delete own deals"
  ON public.deals FOR DELETE
  USING (user_id = public.current_user_row_id());

-- ============================================
-- HABITS
-- ============================================

DROP POLICY IF EXISTS "Users can view own habits" ON public.habits;
DROP POLICY IF EXISTS "Users can insert own habits" ON public.habits;
DROP POLICY IF EXISTS "Users can update own habits" ON public.habits;
DROP POLICY IF EXISTS "Users can delete own habits" ON public.habits;

CREATE POLICY "Users can view own habits"
  ON public.habits FOR SELECT
  USING (user_id = public.current_user_row_id());

CREATE POLICY "Users can insert own habits"
  ON public.habits FOR INSERT
  WITH CHECK (user_id = public.current_user_row_id());

CREATE POLICY "Users can update own habits"
  ON public.habits FOR UPDATE
  USING (user_id = public.current_user_row_id())
  WITH CHECK (user_id = public.current_user_row_id());

CREATE POLICY "Users can delete own habits"
  ON public.habits FOR DELETE
  USING (user_id = public.current_user_row_id());

-- ============================================
-- HABIT LOGS
-- ============================================

DROP POLICY IF EXISTS "Users can view own habit logs" ON public.habit_logs;
DROP POLICY IF EXISTS "Users can insert own habit logs" ON public.habit_logs;
DROP POLICY IF EXISTS "Users can update own habit logs" ON public.habit_logs;
DROP POLICY IF EXISTS "Users can delete own habit logs" ON public.habit_logs;

CREATE POLICY "Users can view own habit logs"
  ON public.habit_logs FOR SELECT
  USING (user_id = public.current_user_row_id());

CREATE POLICY "Users can insert own habit logs"
  ON public.habit_logs FOR INSERT
  WITH CHECK (user_id = public.current_user_row_id());

CREATE POLICY "Users can update own habit logs"
  ON public.habit_logs FOR UPDATE
  USING (user_id = public.current_user_row_id())
  WITH CHECK (user_id = public.current_user_row_id());

CREATE POLICY "Users can delete own habit logs"
  ON public.habit_logs FOR DELETE
  USING (user_id = public.current_user_row_id());

-- ============================================
-- JOURNAL ENTRIES
-- ============================================

DROP POLICY IF EXISTS "Users can view own journal entries" ON public.journal_entries;
DROP POLICY IF EXISTS "Users can insert own journal entries" ON public.journal_entries;
DROP POLICY IF EXISTS "Users can update own journal entries" ON public.journal_entries;
DROP POLICY IF EXISTS "Users can delete own journal entries" ON public.journal_entries;

CREATE POLICY "Users can view own journal entries"
  ON public.journal_entries FOR SELECT
  USING (user_id = public.current_user_row_id());

CREATE POLICY "Users can insert own journal entries"
  ON public.journal_entries FOR INSERT
  WITH CHECK (user_id = public.current_user_row_id());

CREATE POLICY "Users can update own journal entries"
  ON public.journal_entries FOR UPDATE
  USING (user_id = public.current_user_row_id())
  WITH CHECK (user_id = public.current_user_row_id());

CREATE POLICY "Users can delete own journal entries"
  ON public.journal_entries FOR DELETE
  USING (user_id = public.current_user_row_id());

