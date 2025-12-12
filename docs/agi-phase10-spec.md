# 🧠 PULSE AGI — PHASE 10

## Commercial Banking / SBA / Lending Vertical Pack v1

> **You are:** Senior Staff Engineer on Pulse OS (Next.js 16 + Supabase + TypeScript).

> **Goal:**

> Implement the **Banking / Lending Vertical Pack** on top of Phases 1–9 so that Pulse can:

>
> * Understand **loan deals, borrowers, guarantors, collateral, covenants**.

> * Act as a **Credit Risk / Underwriting / Deal Coach agent**.

> * Integrate with **Scoreboards + Job Mesh + Voice OS + AGI Kernel**.

> * Support **SBA 7(a)/504 + CRE + LOC** patterns out of the box.



This should feel like:

> "Talk to Pulse about a deal and it thinks like a senior credit officer + SBA nerd + pipeline operator."

---

## 0. ASSUMPTIONS

Before coding, confirm:

1. From earlier phases:

   * AGI kernel + agents + planner + executor:

     * `lib/agi/types.ts`, `worldstate.ts`, `kernel.ts`, `planner.ts`, `agents/*`, `executor.ts`

   * Digital twin + simulations + risk maps:

     * `lib/agi/digital_twin/*`, `simulation/*`, `risk_opportunity/*`

   * Machine teaching + policies + eval harness:

     * `lib/agi/policy/engine.ts`, `agi_feedback` + `agi_eval_*`

   * Modes, entitlements, onboarding, AGI Command Center:

     * `lib/agi/modes.ts`, `entitlements.ts`, `/agi/command-center`

   * Multi-user org support & org AGI:

     * `organizations`, `org_members`, `org_agi_runs`, etc.

   * Voice OS:

     * `voice_sessions`, `voice_turns`

     * `/api/voice/session`, `/api/voice/utterance`

     * `lib/voice/router.ts`, `routes/coach.ts`, `routes/agi_command.ts`, etc.

   * Job / Vertical Mesh:

     * `job_verticals`, `jobs`, `user_jobs`

     * `lib/jobs/service.ts`, `descriptor.ts`

2. There is an existing **deals / CRM** concept (even basic) under something like:

   * `deals`, `crm_deals`, or similar table(s).

   * `lib/crm/deals.ts` or similar service.

You will **extend** that with banking-specific structures where needed, without breaking generic CRM.

---

# PART 1 — BANKING VERTICAL CONFIG (DOMAIN PACK)

We will configure:

* `job_verticals` entry for **banking/lending**.

* Domain-specific prompts, KPIs, templates.

### 1.1. Supabase: Extend `job_verticals` with Config

Update migration or add:

`supabase/migrations/20251227_banking_vertical_config_v1.sql`

```sql
-- ============================================
-- PULSE BANKING VERTICAL CONFIG
-- ============================================

-- Ensure config column exists (may already exist from Phase 9)
alter table public.job_verticals
  add column if not exists config jsonb not null default '{}'::jsonb;

-- Seed banking/lending vertical
insert into public.job_verticals (key, name, description, config)
values (
  'banking_lending',
  'Banking / Commercial Lending / SBA',
  'Commercial banking, SBA, CRE lending, lines of credit, and portfolio management.',
  '{
    "default_scoreboards": [
      {
        "key": "loan_officer_core",
        "name": "Loan Officer Core Scoreboard",
        "kpis": [
          "Active Deals",
          "Deals to Close in 30d",
          "Weighted DSCR",
          "Average LTV",
          "Docs Outstanding",
          "Credit Memos in Draft",
          "Pipeline Velocity"
        ]
      }
    ],
    "prompts": {
      "coach_system_prompt": "You are an expert commercial lender and credit officer specializing in SBA, CRE, and business lending. You understand DSCR, global cash flow, LTV, guarantor strength, industry risk (NAICS), covenants, and regulatory/compliance constraints. Provide practical, risk-aware, bank-sane guidance. You are not a lawyer or regulator; always recommend formal credit policy and legal/compliance review for edge cases.",
      "deal_summary_prompt": "Given the structured deal data, produce a concise lender-facing summary: facility types, amounts, collateral, DSCR, LTV, repayment sources, guarantors, key risks, and mitigants."
    }
  }'::jsonb
)
on conflict (key) do update set
  name = excluded.name,
  description = excluded.description,
  config = excluded.config;
```

---

# PART 2 — BANKING DOMAIN DATA MODEL

We'll add **banking-specific overlays** on top of your deals.

### 2.1. Supabase: Banking Deal Overlays

Create:

`supabase/migrations/20251228_banking_deal_overlay_v1.sql`

```sql
-- ============================================
-- PULSE BANKING DEAL OVERLAYS
-- Adds structured credit/underwriting fields around existing deals
-- ============================================

-- Assumes a generic deals table already exists, e.g. "deals" with primary key id (uuid).
-- Adjust table name and id type as needed.

-- If deals table doesn't exist, create a minimal one
create table if not exists public.deals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  name text not null,
  status text not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists deals_user_id_idx on public.deals(user_id);

create table if not exists public.banking_deal_profiles (
  id uuid primary key default gen_random_uuid(),
  deal_id uuid not null references public.deals(id) on delete cascade,

  -- Basic lending classification
  facility_type text,          -- 'SBA_7a', 'SBA_504', 'CRE', 'LOC', 'TERM', 'EQUIPMENT', etc.
  purpose text,                -- natural language

  -- Key numeric metrics
  requested_amount numeric,    -- base currency
  appraised_value numeric,
  ltv numeric,                 -- loan-to-value (0-1)
  dscr numeric,                -- debt service coverage ratio (0-2+)
  global_dscr numeric,         -- if computed

  -- Risk & rating
  internal_rating text,        -- 'Pass', 'Special Mention', etc.
  risk_bucket text,            -- 'Low', 'Moderate', 'High'
  naics_code text,
  industry_risk text,

  -- Collateral summary
  collateral_summary jsonb,    -- structured: [{ type, value, lien_position }, ...]

  -- Borrower/guarantor summary
  borrower_summary jsonb,      -- { entity_type, years_in_business, revenue, ebitda, etc. }
  guarantor_summary jsonb,     -- array of guarantors with net worth, liquidity, etc.

  -- Covenant & structure hints
  proposed_covenants jsonb,
  structure_notes text,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists banking_deal_profiles_deal_id_unique
  on public.banking_deal_profiles(deal_id);

create table if not exists public.banking_financial_spreads (
  id uuid primary key default gen_random_uuid(),
  deal_id uuid not null references public.deals(id) on delete cascade,

  period_start date,
  period_end date,

  -- base financials (could be aggregated from statements)
  revenue numeric,
  ebitda numeric,
  interest_expense numeric,
  total_debt_service numeric,
  owner_distribution numeric,

  calculated_dscr numeric,

  source text,                 -- 'tax_return', 'internal_statement', etc.

  created_at timestamptz not null default now()
);

create index if not exists banking_financial_spreads_deal_id_idx
  on public.banking_financial_spreads(deal_id);

create table if not exists public.banking_sba_assessments (
  id uuid primary key default gen_random_uuid(),
  deal_id uuid not null references public.deals(id) on delete cascade,

  -- SBA 7a/504 eligibility notes
  program text,                 -- '7a', '504'
  eligibility_status text,      -- 'eligible', 'ineligible', 'borderline', 'unknown'
  issues jsonb,                 -- [{ code, description, severity }]

  -- Lender-usable text summary
  summary text,

  created_at timestamptz not null default now()
);

create index if not exists banking_sba_assessments_deal_id_idx
  on public.banking_sba_assessments(deal_id);

create table if not exists public.banking_credit_memos (
  id uuid primary key default gen_random_uuid(),
  deal_id uuid not null references public.deals(id) on delete cascade,
  user_id uuid not null references users(id),

  -- State of memo
  status text not null default 'draft', -- 'draft', 'in_review', 'approved', 'archived'

  -- Core sections as markdown or structured content
  content jsonb not null default '{}'::jsonb,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists banking_credit_memos_deal_id_idx
  on public.banking_credit_memos(deal_id);

create table if not exists public.banking_underwriting_checklists (
  id uuid primary key default gen_random_uuid(),
  deal_id uuid not null references public.deals(id) on delete cascade,
  user_id uuid not null references users(id),

  -- Checklist items: [{ key, label, status: 'pending'|'done'|'n/a', notes }]
  items jsonb not null default '[]'::jsonb,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists banking_underwriting_checklists_deal_id_idx
  on public.banking_underwriting_checklists(deal_id);
```

You can extend later, but this gives AGI a rich structure to reason about.

---

# PART 3 — BANKING DOMAIN SERVICES (CALCS & HELPERS)

Create a banking package:

`lib/banking/` with:

* `metrics.ts`

* `sba.ts`

* `checklist.ts`

* `credit_memo.ts`

* `world_adapters.ts`

### 3.1. Metrics Helpers

`lib/banking/metrics.ts`:

```ts
export interface DSCRInput {
  netOperatingIncome: number;
  totalDebtService: number;
}

export function calcDSCR(input: DSCRInput): number | null {
  if (!input.totalDebtService || input.totalDebtService === 0) return null;
  return input.netOperatingIncome / input.totalDebtService;
}

export function calcLTV(loanAmount: number, collateralValue: number): number | null {
  if (!collateralValue || collateralValue === 0) return null;
  return loanAmount / collateralValue;
}

export interface GlobalDSCRInput {
  totalNOI: number;
  totalDebtService: number;
  ownerDistributions?: number;
}

export function calcGlobalDSCR(input: GlobalDSCRInput): number | null {
  if (!input.totalDebtService || input.totalDebtService === 0) return null;
  const adjustedNOI = input.totalNOI - (input.ownerDistributions || 0);
  return adjustedNOI / input.totalDebtService;
}

// Additional helpers as needed (leverage ratios, etc.)
```

### 3.2. SBA Assessment Helpers

`lib/banking/sba.ts`:

```ts
import { supabaseAdmin } from '@/lib/supabase';
import { callAI } from '@/lib/ai/call';

export interface SBAAssessmentInput {
  dealId: string;
  facilityType: string | null;
  purpose: string | null;
  naicsCode?: string | null;
  borrowerSummary?: any;
  requestedAmount?: number;
}

export interface SBAAssessmentResult {
  program: '7a' | '504' | 'unknown';
  eligibility_status: 'eligible' | 'ineligible' | 'borderline' | 'unknown';
  issues: { code: string; description: string; severity: 'low' | 'medium' | 'high' }[];
  summary: string;
}

export async function runSBAAssessment(input: SBAAssessmentInput): Promise<SBAAssessmentResult> {
  // Use LLM-based classification via your existing LLM wrapper
  const systemPrompt = `You are an SBA eligibility expert. Analyze the deal information and determine SBA 7(a) or 504 eligibility. Identify any issues that would affect eligibility.`;

  const userPrompt = `Facility Type: ${input.facilityType || 'Unknown'}
Purpose: ${input.purpose || 'Not specified'}
NAICS Code: ${input.naicsCode || 'Not specified'}
Requested Amount: ${input.requestedAmount ? `$${input.requestedAmount.toLocaleString()}` : 'Not specified'}
Borrower Summary: ${JSON.stringify(input.borrowerSummary || {}, null, 2)}

Determine:
1. Which SBA program (7a or 504) is most appropriate, or 'unknown' if unclear
2. Eligibility status: eligible, ineligible, borderline, or unknown
3. Any specific issues that affect eligibility (code, description, severity)
4. A concise summary for the lender

Respond with JSON only.`;

  const result = await callAI({
    userId: 'system',
    model: 'gpt-4o-mini',
    systemPrompt,
    userPrompt,
    temperature: 0.3,
    maxTokens: 800,
    feature: 'sba_assessment',
  });

  if (result.success && result.content) {
    try {
      const parsed = JSON.parse(result.content);
      return {
        program: parsed.program || 'unknown',
        eligibility_status: parsed.eligibility_status || 'unknown',
        issues: parsed.issues || [],
        summary: parsed.summary || 'SBA assessment completed.',
      };
    } catch {
      // Fallback if JSON parse fails
    }
  }

  // Fallback
  return {
    program: 'unknown',
    eligibility_status: 'unknown',
    issues: [],
    summary: 'SBA assessment could not be completed automatically. Please review manually.',
  };
}

export async function saveSBAAssessment(
  dealId: string,
  result: SBAAssessmentResult,
): Promise<void> {
  const { error } = await supabaseAdmin.from('banking_sba_assessments').insert({
    deal_id: dealId,
    program: result.program,
    eligibility_status: result.eligibility_status,
    issues: result.issues,
    summary: result.summary,
  });
  if (error) console.error('[Banking][SBA] Failed to save assessment', error);
}

export async function getSBAAssessment(dealId: string): Promise<SBAAssessmentResult | null> {
  const { data, error } = await supabaseAdmin
    .from('banking_sba_assessments')
    .select('*')
    .eq('deal_id', dealId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error('[Banking][SBA] Failed to load assessment', error);
    return null;
  }

  if (!data) return null;

  return {
    program: data.program as any,
    eligibility_status: data.eligibility_status as any,
    issues: (data.issues as any) || [],
    summary: data.summary || '',
  };
}
```

### 3.3. Checklist Helpers

`lib/banking/checklist.ts`:

```ts
import { supabaseAdmin } from '@/lib/supabase';

export interface ChecklistItem {
  key: string;
  label: string;
  status: 'pending' | 'done' | 'n/a';
  notes?: string;
}

export interface UnderwritingChecklist {
  id: string;
  deal_id: string;
  user_id: string;
  items: ChecklistItem[];
}

const DEFAULT_SBA_7A_CHECKLIST: ChecklistItem[] = [
  { key: 'sba_form_1919', label: 'SBA Form 1919 (Borrower Information)', status: 'pending' },
  { key: 'tax_returns_3yr', label: '3 Years Tax Returns', status: 'pending' },
  { key: 'personal_financial_statement', label: 'Personal Financial Statement', status: 'pending' },
  { key: 'business_plan', label: 'Business Plan', status: 'pending' },
  { key: 'use_of_proceeds', label: 'Use of Proceeds Statement', status: 'pending' },
  { key: 'debt_schedule', label: 'Schedule of Business Debt', status: 'pending' },
  { key: 'ownership_structure', label: 'Ownership Structure Documentation', status: 'pending' },
];

const DEFAULT_CRE_CHECKLIST: ChecklistItem[] = [
  { key: 'rent_roll', label: 'Rent Roll', status: 'pending' },
  { key: 'lease_agreements', label: 'Lease Agreements', status: 'pending' },
  { key: 'appraisal', label: 'Property Appraisal', status: 'pending' },
  { key: 'environmental_report', label: 'Phase I Environmental Report', status: 'pending' },
  { key: 'title_insurance', label: 'Title Insurance Commitment', status: 'pending' },
  { key: 'borrower_financials', label: 'Borrower Financial Statements', status: 'pending' },
];

export function generateChecklistForFacilityType(facilityType: string | null): ChecklistItem[] {
  if (!facilityType) return [];

  const upper = facilityType.toUpperCase();
  if (upper.includes('SBA') || upper.includes('7A')) {
    return [...DEFAULT_SBA_7A_CHECKLIST];
  }
  if (upper.includes('CRE') || upper.includes('COMMERCIAL REAL ESTATE')) {
    return [...DEFAULT_CRE_CHECKLIST];
  }

  // Generic checklist
  return [
    { key: 'financial_statements', label: 'Financial Statements', status: 'pending' },
    { key: 'tax_returns', label: 'Tax Returns', status: 'pending' },
    { key: 'credit_report', label: 'Credit Report', status: 'pending' },
    { key: 'business_plan', label: 'Business Plan', status: 'pending' },
  ];
}

export async function getOrCreateChecklist(
  dealId: string,
  userId: string,
  facilityType?: string | null,
): Promise<UnderwritingChecklist | null> {
  // Try to load existing
  const { data: existing } = await supabaseAdmin
    .from('banking_underwriting_checklists')
    .select('*')
    .eq('deal_id', dealId)
    .eq('user_id', userId)
    .maybeSingle();

  if (existing) {
    return {
      id: existing.id,
      deal_id: existing.deal_id,
      user_id: existing.user_id,
      items: (existing.items as ChecklistItem[]) || [],
    };
  }

  // Create new with default items
  const defaultItems = generateChecklistForFacilityType(facilityType || null);
  const { data: created, error } = await supabaseAdmin
    .from('banking_underwriting_checklists')
    .insert({
      deal_id: dealId,
      user_id: userId,
      items: defaultItems,
    })
    .select('*')
    .single();

  if (error || !created) {
    console.error('[Banking][Checklist] Failed to create', error);
    return null;
  }

  return {
    id: created.id,
    deal_id: created.deal_id,
    user_id: created.user_id,
    items: (created.items as ChecklistItem[]) || [],
  };
}

export async function updateChecklistItem(
  checklistId: string,
  itemKey: string,
  updates: Partial<ChecklistItem>,
): Promise<void> {
  const { data: checklist } = await supabaseAdmin
    .from('banking_underwriting_checklists')
    .select('items')
    .eq('id', checklistId)
    .single();

  if (!checklist) return;

  const items = (checklist.items as ChecklistItem[]) || [];
  const updatedItems = items.map((item) =>
    item.key === itemKey ? { ...item, ...updates } : item,
  );

  const { error } = await supabaseAdmin
    .from('banking_underwriting_checklists')
    .update({ items: updatedItems, updated_at: new Date().toISOString() })
    .eq('id', checklistId);

  if (error) console.error('[Banking][Checklist] Failed to update item', error);
}
```

### 3.4. Credit Memo Helpers

`lib/banking/credit_memo.ts`:

```ts
import { supabaseAdmin } from '@/lib/supabase';
import { callAI } from '@/lib/ai/call';

export interface CreditMemoContent {
  executive_summary?: string;
  strengths?: string[];
  weaknesses?: string[];
  mitigants?: string[];
  structure?: string;
  covenants?: string[];
  recommendation?: string;
}

export interface CreditMemo {
  id: string;
  deal_id: string;
  user_id: string;
  status: 'draft' | 'in_review' | 'approved' | 'archived';
  content: CreditMemoContent;
}

export async function generateCreditMemoDraft(
  dealId: string,
  userId: string,
  dealProfile: any,
  financialSpreads: any[],
  sbaAssessment?: any,
): Promise<CreditMemoContent> {
  const systemPrompt = `You are an expert credit analyst writing a credit memo for a commercial loan. Structure your response as JSON with sections: executive_summary, strengths (array), weaknesses (array), mitigants (array), structure, covenants (array), recommendation.`;

  const userPrompt = `Deal Profile:
${JSON.stringify(dealProfile, null, 2)}

Financial Spreads:
${JSON.stringify(financialSpreads, null, 2)}

${sbaAssessment ? `SBA Assessment:\n${JSON.stringify(sbaAssessment, null, 2)}` : ''}

Generate a credit memo draft with all sections. Be specific, risk-aware, and lender-focused.`;

  const result = await callAI({
    userId,
    model: 'gpt-4o-mini',
    systemPrompt,
    userPrompt,
    temperature: 0.5,
    maxTokens: 2000,
    feature: 'credit_memo_generation',
  });

  if (result.success && result.content) {
    try {
      return JSON.parse(result.content);
    } catch {
      // Fallback
    }
  }

  // Fallback structure
  return {
    executive_summary: 'Credit memo draft - please complete manually.',
    strengths: [],
    weaknesses: [],
    mitigants: [],
    structure: '',
    covenants: [],
    recommendation: '',
  };
}

export async function createCreditMemo(
  dealId: string,
  userId: string,
  content: CreditMemoContent,
): Promise<CreditMemo | null> {
  const { data, error } = await supabaseAdmin
    .from('banking_credit_memos')
    .insert({
      deal_id: dealId,
      user_id: userId,
      status: 'draft',
      content,
    })
    .select('*')
    .single();

  if (error || !data) {
    console.error('[Banking][CreditMemo] Failed to create', error);
    return null;
  }

  return {
    id: data.id,
    deal_id: data.deal_id,
    user_id: data.user_id,
    status: data.status as any,
    content: data.content as CreditMemoContent,
  };
}

export async function updateCreditMemo(
  memoId: string,
  content: Partial<CreditMemoContent>,
): Promise<void> {
  const { data: existing } = await supabaseAdmin
    .from('banking_credit_memos')
    .select('content')
    .eq('id', memoId)
    .single();

  if (!existing) return;

  const updatedContent = { ...(existing.content as CreditMemoContent), ...content };

  const { error } = await supabaseAdmin
    .from('banking_credit_memos')
    .update({
      content: updatedContent,
      updated_at: new Date().toISOString(),
    })
    .eq('id', memoId);

  if (error) console.error('[Banking][CreditMemo] Failed to update', error);
}

export async function getCreditMemo(dealId: string): Promise<CreditMemo | null> {
  const { data, error } = await supabaseAdmin
    .from('banking_credit_memos')
    .select('*')
    .eq('deal_id', dealId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error('[Banking][CreditMemo] Failed to load', error);
    return null;
  }

  if (!data) return null;

  return {
    id: data.id,
    deal_id: data.deal_id,
    user_id: data.user_id,
    status: data.status as any,
    content: data.content as CreditMemoContent,
  };
}
```

### 3.5. World State Adapters

`lib/banking/world_adapters.ts`:

```ts
import { supabaseAdmin } from '@/lib/supabase';
import { calcDSCR, calcLTV } from './metrics';

/**
 * Resolve Clerk ID to database user ID
 */
async function resolveUserId(clerkId: string): Promise<string> {
  const { data: userRow } = await supabaseAdmin
    .from("users")
    .select("id")
    .eq("clerk_id", clerkId)
    .maybeSingle();

  return userRow?.id || clerkId;
}

export async function buildBankingWorldStateOverlay(userId: string): Promise<any> {
  const dbUserId = await resolveUserId(userId);

  // Load user's deals with banking profiles
  const { data: deals } = await supabaseAdmin
    .from('deals')
    .select(`
      id,
      name,
      status,
      banking_deal_profiles (*),
      banking_financial_spreads (*)
    `)
    .eq('user_id', dbUserId)
    .eq('status', 'active');

  if (!deals || deals.length === 0) {
    return null;
  }

  const dealsWithWeakDSCR: any[] = [];
  const dealsWithHighLTV: any[] = [];
  const dealsMissingSpreads: any[] = [];
  const dealsMissingChecklists: any[] = [];

  for (const deal of deals) {
    const profile = (deal as any).banking_deal_profiles?.[0];
    if (!profile) continue;

    // Check DSCR
    if (profile.dscr !== null && profile.dscr < 1.20) {
      dealsWithWeakDSCR.push({ id: deal.id, name: deal.name, dscr: profile.dscr });
    }

    // Check LTV
    if (profile.ltv !== null && profile.ltv > 0.80) {
      dealsWithHighLTV.push({ id: deal.id, name: deal.name, ltv: profile.ltv });
    }

    // Check for spreads
    const spreads = (deal as any).banking_financial_spreads || [];
    if (spreads.length === 0) {
      dealsMissingSpreads.push({ id: deal.id, name: deal.name });
    }

    // Check for checklist
    const { data: checklist } = await supabaseAdmin
      .from('banking_underwriting_checklists')
      .select('id')
      .eq('deal_id', deal.id)
      .maybeSingle();

    if (!checklist) {
      dealsMissingChecklists.push({ id: deal.id, name: deal.name });
    }
  }

  return {
    dealsWithWeakDSCR,
    dealsWithHighLTV,
    dealsMissingSpreads,
    dealsMissingChecklists,
    totalActiveDeals: deals.length,
  };
}
```

---

# PART 4 — AGI INTEGRATION: BANKING-SPECIFIC AGENTS

We'll add **3 banking agents** to the AGI mesh for users in the banking vertical:

1. **CreditRiskAgent** – evaluate deal risk, highlight DSCR/LTV, industry, guarantor strength, etc.

2. **UnderwritingFlowAgent** – manage underwriting checklist, missing docs, memo status.

3. **PortfolioRiskAgent** – scan entire portfolio for credits drifting into risk.

### 4.1. Extend WorldState for Banking Signals

In `lib/agi/worldstate.ts`:

* In `work:` section, add:

```ts
  work: {
    activeDeals: any[];
    keyDeadlines: any[];
    blockedItems: any[];
    // NEW: Banking-specific view (where relevant)
    banking?: {
      dealsWithWeakDSCR: any[];
      dealsWithHighLTV: any[];
      dealsMissingSpreads: any[];
      dealsMissingChecklists: any[];
      totalActiveDeals: number;
      // You can fill these from banking_deal_profiles & spreads
    };
  };
```

Populate `work.banking` for users whose `user_jobs` includes banking vertical.

### 4.2. Banking Agents

Create:

`lib/agi/agents/banking/CreditRiskAgent.ts`

`lib/agi/agents/banking/UnderwritingFlowAgent.ts`

`lib/agi/agents/banking/PortfolioRiskAgent.ts`

Example: `CreditRiskAgent.ts`

```ts
import { Agent, makeAgentResult } from '../../agents';
import { AgentContext, AGIAction } from '../../types';

export const creditRiskAgent: Agent = {
  name: 'CreditRiskAgent',
  description: 'Analyzes loan deals for DSCR, LTV, industry risk, and guarantor strength.',
  domains: ['work', 'finance'],
  priority: 95,
  defaultAggressiveness: 'balanced',

  async run(ctx: AgentContext) {
    const world: any = ctx.world;
    const banking = world.work?.banking;
    const actions: AGIAction[] = [];

    if (!banking) {
      return makeAgentResult(
        'CreditRiskAgent',
        'No banking overlay data available for user.',
        [],
        0.2,
      );
    }

    const weakDSCRDeals = banking.dealsWithWeakDSCR ?? [];
    const highLTVDeals = banking.dealsWithHighLTV ?? [];

    if (weakDSCRDeals.length > 0) {
      actions.push({
        type: 'log_insight',
        label: `You have ${weakDSCRDeals.length} deal${weakDSCRDeals.length !== 1 ? 's' : ''} with DSCR below 1.20x. Review structure and mitigants.`,
        details: {
          domain: 'work',
          scope: 'deal',
          focus: 'dscr',
          deals: weakDSCRDeals.map((d: any) => d.id),
          subsource: 'credit_risk_agent',
        },
        requiresConfirmation: false,
        riskLevel: 'medium',
      });
    }

    if (highLTVDeals.length > 0) {
      actions.push({
        type: 'log_insight',
        label: `You have ${highLTVDeals.length} deal${highLTVDeals.length !== 1 ? 's' : ''} with LTV above 80%. Consider additional collateral or guarantor support.`,
        details: {
          domain: 'work',
          scope: 'deal',
          focus: 'ltv',
          deals: highLTVDeals.map((d: any) => d.id),
          subsource: 'credit_risk_agent',
        },
        requiresConfirmation: false,
        riskLevel: 'medium',
      });
    }

    const reasoning = `Evaluated banking deals for DSCR and LTV. Found ${weakDSCRDeals.length} weak DSCR and ${highLTVDeals.length} high LTV deals.`;

    return makeAgentResult('CreditRiskAgent', reasoning, actions, 0.8);
  },
};
```

Similarly:

* **UnderwritingFlowAgent**:

  * Look at `banking_underwriting_checklists` + `banking_credit_memos`.

  * Propose actions:

    * "Create underwriting checklist for Deal X"

    * "Move Credit Memo for Deal Y to 'in_review'"

    * "Nudge you to complete 3 checklist items today"

* **PortfolioRiskAgent** (optionally org-level later):

  * Use aggregated DSCR/LTV across your deals.

  * Flag "Top 5 riskier credits".

### 4.3. Register Banking Agents Conditionally

In `lib/agi/registry.ts`:

* Import banking agents and **only include** them if the user's job vertical includes `banking_lending`.

You can do this by:

* Modifying `getRegisteredAgents(userProfile?)` to conditionally push `creditRiskAgent`, etc. based on `AGIUserProfile` or `user_jobs`.

---

# PART 5 — BANKING COACH (LLM-POWERED) & VOICE HOOK

### 5.1. Banking Job Coach LLM

Extend `lib/voice/routes/coach.ts` (or create `lib/coaches/job/llm.ts`) to:

* If job.vertical.key = `banking_lending`, use vertical config:

  * `config.prompts.coach_system_prompt`

  * Additional domain hints (DSCR, SBA, etc.)

### 5.2. Voice Route: "Deal Coach"

In `lib/voice/routes/coach.ts`:

* If `coachDomain === 'job'` and primary job vertical = `banking_lending`:

  * Add a **deal-aware** mode:

    * For utterances like:

      * "Help me think through the Dollar General deal."

      * "Is the Ponderosa Campground loan too aggressive?"

    * Use heuristics or a small fuzzy search:

      * Search `deals` by name / nicknames / borrower.

      * Load banking overlay (`banking_deal_profiles`, `banking_financial_spreads`, `banking_sba_assessments`).

    * Pass this structured bundle into the LLM context so it can respond like:

      > "On Dollar General: DSCR 1.28x vs your target 1.25x, LTV 72%, guarantor liquidity strong, SBA not needed. Key watch: tenant rollover risk at year 10."

This is **the** wow moment for other lenders.

---

# PART 6 — UI: LENDER DASHBOARD & DEAL WORKSPACE

Create a **Banking overlay** inside Pulse:

### 6.1. Lender Dashboard

New page:

`app/(authenticated)/banking/dashboard/page.tsx`

Features:

* **Top cards**:

  * Active Deals

  * Deals Closing in 30 Days

  * Avg DSCR (weighted)

  * Avg LTV

  * Docs Outstanding

  * Memos in Draft

* **Tables**:

  * "Deals with Weak DSCR"

  * "Deals with High LTV"

  * "Deals Missing Spreads / Checklists"

All data pulled from:

* `deals`

* `banking_deal_profiles`

* `banking_financial_spreads`

* `banking_underwriting_checklists`

### 6.2. Deal Workspace

New nested route:

`app/(authenticated)/banking/deals/[dealId]/page.tsx`

Tabs:

1. **Summary**

   * Basic deal info

   * Banking overlay metrics (DSCR, LTV, facility type, SBA flag)

   * Quick risk tags (Low/Med/High)

2. **Financials**

   * Table of `banking_financial_spreads`

   * Buttons:

     * "Add spread"

     * "Recalculate DSCR"

3. **SBA**

   * Show `banking_sba_assessments` if any.

   * Button: "Run SBA Assessment" → calls `runSBAAssessment`, saves result.

4. **Checklist**

   * Render `banking_underwriting_checklists.items` as a checklist UI.

   * New items can be added.

   * AGI can propose pre-filled checklists via UnderwritingFlowAgent.

5. **Credit Memo**

   * Show `banking_credit_memos` status.

   * Button: "Generate Draft Credit Memo":

     * Calls LLM with structured deal data.

     * Stores initial `content` JSON.

   * Editor UI for memo sections.

Add a **"Talk to Pulse about this deal"** button that:

* Opens `TalkToPulseWidget` in a side panel with `context='coach'` and `tag='deal:<dealId>'`.

---

# PART 7 — EVALUATION & MACHINE TEACHING FOR BANKING

### 7.1. Banking Eval Cases

Use `agi_eval_suites` and `agi_eval_cases` from Phase 6:

* Create an eval suite `"banking_vertical_v1"`:

  * Cases:

    1. Simple CRE deal with clear DSCR → expectation: `CreditRiskAgent` flags DSCR as OK but notes tenant risk.

    2. SBA deal with borderline eligibility → expectation: `SBAAssessment` marks as `borderline` with at least one issue.

    3. Deal missing spreads/checklist → expectation: `UnderwritingFlowAgent` proposes doc/checklist actions.

You can seed these input JSONs with synthetic data.

### 7.2. Feedback Wiring

When lender users:

* **Like** or **dislike** a banking suggestion

* Provide **corrections** (e.g., "DSCR calced wrong because you excluded owner draw")

…store these in `agi_feedback` with `agent_name` set to banking agents.

Self-tuning engine can:

* Tweak thresholds (e.g. what DSCR is considered "weak") per user over time.

---

# PART 8 — SUCCESS CRITERIA FOR PHASE 10

Phase 10 is **done** when:

### ✅ Data & Structure

* `banking_deal_profiles`, `banking_financial_spreads`, `banking_sba_assessments`, `banking_credit_memos`, `banking_underwriting_checklists` exist and are being populated.

* Job vertical `banking_lending` exists with appropriate config.

### ✅ Banking Agents

* For a user whose job vertical is `banking_lending`, AGI registry includes:

  * `CreditRiskAgent`

  * `UnderwritingFlowAgent`

  * (Optionally) `PortfolioRiskAgent` for multi-deal view

* `runAGIKernel` for such a user returns banking-flavored actions like:

  * "You have 3 deals with DSCR below 1.20x—review structure and mitigants."

  * "Deal X is missing financial spreads and underwriting checklist—suggest completing these first."

  * "You have 2 memos stalled in draft—schedule deep work to finish them."

### ✅ Voice + Deal Coach

* From the **deal workspace**, using the Talk widget, you can say:

  * "Pulse, walk me through the risks on this deal."

  * "Is this deal strong enough for SBA 7a?"

  * "What covenants would you recommend?"

…and get coherent, deal-aware, banking-savvy answers.

### ✅ Lender Dashboard

* `/banking/dashboard` shows:

  * Core metrics (Active deals, DSCR/LTV, docs outstanding, etc.)

  * Lists of risk deals (weak DSCR, high LTV, missing docs).

### ✅ Eval & Teaching

* `agi_eval_suites` contains at least one `"banking_vertical_v1"` suite.

* You can run it and see metrics in your AGI Health view.

* Banking agents respond to `agi_feedback` pattern (like/dislike) for self-tuning.

---

That's **Phase 10**:

Pulse becomes not just a Life OS, but a **Banker OS** — a domain pack that lets your AGI think like a senior lender.

Once Claude is chewing on this, we can make **Phase 11** either:

* Full **mobile + call overlay** (Pulse listening on your calls, injecting notes + tasks + deal updates), or

* A **cross-vertical pack system** (Sales, Engineering, Healthcare, etc.) that reuses the same patterns we just built for banking.

**End of spec.**


