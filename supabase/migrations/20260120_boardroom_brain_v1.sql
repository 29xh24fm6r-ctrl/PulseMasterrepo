-- Boardroom Brain v1 - Strategic Mind + Executive Council + Decision Theater
-- supabase/migrations/20260120_boardroom_brain_v1.sql

-- ============================================
-- STRATEGIC DOMAINS
-- ============================================

CREATE TABLE IF NOT EXISTS public.strategic_domains (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name text NOT NULL,          -- 'Career', 'Pulse OS', 'Banking Deals', 'Family Finance'
  slug text NOT NULL,
  description text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now(),
  UNIQUE (user_id, slug)
);

CREATE INDEX IF NOT EXISTS idx_strategic_domains_user
  ON public.strategic_domains (user_id, is_active);

-- ============================================
-- STRATEGIC OBJECTIVES
-- ============================================

CREATE TABLE IF NOT EXISTS public.strategic_objectives (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  domain_id uuid NOT NULL REFERENCES strategic_domains(id) ON DELETE CASCADE,
  name text NOT NULL,           -- 'Grow Pulse to 1,000 paying users', 'Hit $X portfolio at bank'
  description text,
  timeframe_start date,
  timeframe_end date,
  priority integer DEFAULT 3,   -- 1 high, 5 low
  status text NOT NULL DEFAULT 'active', -- active | paused | achieved | abandoned
  success_metrics jsonb,        -- ['MRR >= X', 'DSCR >= 1.3', etc.]
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_strategic_objectives_user_domain
  ON public.strategic_objectives (user_id, domain_id, status);

-- ============================================
-- STRATEGIC PLAYBOOKS
-- ============================================

CREATE TABLE IF NOT EXISTS public.strategic_playbooks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,          -- 'Land & Expand', 'Fortress Balance Sheet', 'Beachhead Niche'
  slug text NOT NULL UNIQUE,
  description text,
  domain_hint text,            -- 'business', 'career', 'product', 'finance', 'relationships'
  prerequisites jsonb,         -- optional constraints
  key_moves jsonb,             -- [{step, description}]
  risks jsonb,                 -- ['concentration risk', 'burnout', ...]
  metrics jsonb,               -- how to measure success
  created_at timestamptz DEFAULT now()
);

-- Seed default playbooks
INSERT INTO public.strategic_playbooks (name, slug, description, domain_hint, key_moves, risks, metrics)
VALUES
  ('Land & Expand', 'land_and_expand', 'Start with one customer/niche, then expand systematically', 'business', '[{"step": 1, "description": "Win first anchor customer"}, {"step": 2, "description": "Deepen relationship and expand use cases"}, {"step": 3, "description": "Use success story to win similar customers"}]'::jsonb, '["over-reliance on one customer", "expansion too fast"]'::jsonb, '["customer count", "revenue per customer", "retention rate"]'::jsonb),
  ('Fortress Balance Sheet', 'fortress_balance_sheet', 'Build strong financial foundation before aggressive growth', 'finance', '[{"step": 1, "description": "Build 6-12 month cash reserve"}, {"step": 2, "description": "Reduce high-cost debt"}, {"step": 3, "description": "Establish credit lines"}]'::jsonb, '["opportunity cost", "slower growth"]'::jsonb, '["cash runway", "debt-to-equity", "credit score"]'::jsonb),
  ('Beachhead Niche', 'beachhead_niche', 'Dominate a small niche before expanding', 'business', '[{"step": 1, "description": "Identify narrow niche"}, {"step": 2, "description": "Become #1 in that niche"}, {"step": 3, "description": "Expand to adjacent niches"}]'::jsonb, '["niche too small", "competition"]'::jsonb, '["market share in niche", "brand recognition", "customer acquisition cost"]'::jsonb),
  ('Strategic Pivot', 'strategic_pivot', 'Shift direction when current path is not working', 'career', '[{"step": 1, "description": "Acknowledge current path limitations"}, {"step": 2, "description": "Identify new direction"}, {"step": 3, "description": "Execute pivot with minimal disruption"}]'::jsonb, '["loss of momentum", "uncertainty"]'::jsonb, '["time to new baseline", "stakeholder buy-in", "resource efficiency"]'::jsonb)
ON CONFLICT (slug) DO NOTHING;

-- ============================================
-- STRATEGIC PLANS
-- ============================================

CREATE TABLE IF NOT EXISTS public.strategic_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  objective_id uuid NOT NULL REFERENCES strategic_objectives(id) ON DELETE CASCADE,
  primary_playbook_id uuid REFERENCES strategic_playbooks(id),
  name text NOT NULL,         -- 'Pulse OS Beta to 100 Users'
  summary text,
  assumptions jsonb,          -- ['Prime stays at X', 'Time available 15 hrs/week']
  risk_register jsonb,        -- [{risk, likelihood, impact, mitigation}]
  status text NOT NULL DEFAULT 'draft', -- draft | active | under_review | retired
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_strategic_plans_user_objective
  ON public.strategic_plans (user_id, objective_id, status);

-- ============================================
-- DECISIONS
-- ============================================

CREATE TABLE IF NOT EXISTS public.decisions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  domain_id uuid REFERENCES strategic_domains(id),
  objective_id uuid REFERENCES strategic_objectives(id),
  title text NOT NULL,          -- 'Take this SBA deal?', 'Quit bank in 18 months?'
  description text,
  context jsonb,                -- free-form context, linked entities (deal_id, etc.)
  importance integer DEFAULT 3, -- 1-5
  status text NOT NULL DEFAULT 'open', -- open | decided | shelved
  chosen_option text,
  created_at timestamptz DEFAULT now(),
  decided_at timestamptz
);

CREATE INDEX IF NOT EXISTS idx_decisions_user_status
  ON public.decisions (user_id, status, importance);

-- ============================================
-- DECISION OPTIONS
-- ============================================

CREATE TABLE IF NOT EXISTS public.decision_options (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  decision_id uuid NOT NULL REFERENCES decisions(id) ON DELETE CASCADE,
  label text NOT NULL,            -- 'Yes', 'No', 'Delay 90 days', 'Partner', etc.
  description text,
  is_default boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_decision_options_decision
  ON public.decision_options (decision_id);

-- ============================================
-- EXECUTIVE COUNCIL MEMBERS
-- ============================================

CREATE TABLE IF NOT EXISTS public.executive_council_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name text NOT NULL,            -- 'CFO', 'Risk Officer', 'Strategic General', 'My Future Self'
  slug text NOT NULL,
  description text,
  role text,                     -- 'finance', 'risk', 'strategy', 'ethics', etc.
  archetype_tags jsonb,          -- ['stoic', 'hardliner', 'visionary']
  voice_profile_id uuid,         -- optional link to voice_profiles
  is_system_default boolean NOT NULL DEFAULT false,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now(),
  UNIQUE (user_id, slug)
);

CREATE INDEX IF NOT EXISTS idx_executive_council_members_user
  ON public.executive_council_members (user_id, is_active);

-- ============================================
-- EXECUTIVE COUNCIL VOTES
-- ============================================

CREATE TABLE IF NOT EXISTS public.executive_council_votes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  decision_id uuid NOT NULL REFERENCES decisions(id) ON DELETE CASCADE,
  member_id uuid NOT NULL REFERENCES executive_council_members(id),
  option_id uuid NOT NULL REFERENCES decision_options(id),
  rationale text,
  concerns jsonb,              -- ['concentration risk', 'relationship damage']
  confidence numeric(3,2) CHECK (confidence >= 0 AND confidence <= 1),
  created_at timestamptz DEFAULT now(),
  UNIQUE (decision_id, member_id)
);

CREATE INDEX IF NOT EXISTS idx_executive_council_votes_decision
  ON public.executive_council_votes (decision_id, member_id);

-- ============================================
-- DECISION SCENARIOS
-- ============================================

CREATE TABLE IF NOT EXISTS public.decision_scenarios (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  decision_id uuid NOT NULL REFERENCES decisions(id) ON DELETE CASCADE,
  option_id uuid NOT NULL REFERENCES decision_options(id),
  name text NOT NULL,             -- 'Base case', 'Upside', 'Downside', 'Nuclear'
  parameters jsonb,               -- input knobs passed to simulation engine
  simulated_outcomes jsonb,       -- snapshot from Life/Finance/Deals simulation
  narrative_summary text,         -- human-readable summary
  risk_score numeric(4,2),        -- 0-10 equivalent
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_decision_scenarios_decision_option
  ON public.decision_scenarios (decision_id, option_id);


