-- ============================================================
-- PULSE — PHASE 8 PAYMENTS (STRIPE ISSUING)
-- ============================================================

create table if not exists public.payment_profiles (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null,

  -- Stripe identifiers (tokens/ids ONLY; no raw PAN/CVV)
  stripe_customer_id text null,
  stripe_default_payment_method_id text null,

  stripe_issuing_cardholder_id text null,

  -- Display only
  display_label text null, -- e.g., "Visa •••• 4242"

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists payment_profiles_owner_idx
on public.payment_profiles (owner_user_id);

create table if not exists public.spending_policies (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null,

  name text not null default 'Default Policy',

  -- allowlists
  allowed_merchants jsonb not null default '[]'::jsonb,   -- ["subway","1800flowers"]
  allowed_categories jsonb not null default '[]'::jsonb,  -- ["food","gifts"]

  -- caps
  max_per_purchase_cents integer not null default 2500,   -- $25
  max_per_day_cents integer not null default 7500,        -- $75

  -- confirmation behavior
  confirm_mode text not null default 'ALWAYS_ASK'
    check (confirm_mode in ('ALWAYS_ASK','ASK_ABOVE_THRESHOLD','AUTO_BELOW_THRESHOLD')),
  confirm_threshold_cents integer not null default 1500,  -- $15

  is_active boolean not null default true,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists spending_policies_owner_idx
on public.spending_policies (owner_user_id, is_active);

create table if not exists public.purchase_receipts (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null,
  run_id uuid not null references public.pulse_runs(id) on delete cascade,

  merchant_key text not null, -- "subway", "1800flowers"
  category text not null,     -- "food", "gifts"

  amount_cents integer not null,
  currency text not null default 'usd',

  stripe_charge_id text null,
  stripe_payment_intent_id text null,
  stripe_issuing_card_id text null,

  summary text null,
  metadata jsonb not null default '{}'::jsonb,

  created_at timestamptz not null default now()
);

create index if not exists purchase_receipts_owner_idx
on public.purchase_receipts (owner_user_id, created_at desc);

-- RLS
alter table public.payment_profiles enable row level security;
alter table public.spending_policies enable row level security;
alter table public.purchase_receipts enable row level security;

drop policy if exists "payment_profiles_owner_all" on public.payment_profiles;
create policy "payment_profiles_owner_all"
on public.payment_profiles for all
using (owner_user_id = auth.uid())
with check (owner_user_id = auth.uid());

drop policy if exists "spending_policies_owner_all" on public.spending_policies;
create policy "spending_policies_owner_all"
on public.spending_policies for all
using (owner_user_id = auth.uid())
with check (owner_user_id = auth.uid());

drop policy if exists "purchase_receipts_owner_select" on public.purchase_receipts;
create policy "purchase_receipts_owner_select"
on public.purchase_receipts for select
using (owner_user_id = auth.uid());

drop policy if exists "purchase_receipts_owner_insert" on public.purchase_receipts;
create policy "purchase_receipts_owner_insert"
on public.purchase_receipts for insert
with check (owner_user_id = auth.uid());
