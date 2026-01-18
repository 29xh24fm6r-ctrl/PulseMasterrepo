-- PULSE CHEF V1 - DATABASE FOUNDATION
-- Created: 2026-01-12
-- Description: Core schema for the Pulse Chef system (Inventory, Recipes, Ordering)

-- 1. Canonical Ingredient Table
create table if not exists chef_ingredients (
  id uuid primary key default gen_random_uuid(),
  canonical_name text not null,
  category text not null,
  shelf_life_days integer,
  created_at timestamptz default now()
);

alter table chef_ingredients enable row level security;

-- Public read access for ingredients (System Library)
create policy "Ingredients are viewable by everyone" 
  on chef_ingredients for select 
  using (true);

-- 2. User Inventory (Probabilistic)
create table if not exists chef_inventory_items (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null references auth.users(id) on delete cascade, 
  ingredient_id uuid references chef_ingredients(id),
  confidence_score numeric not null default 1.0, -- 0.0 to 1.0
  freshness_score numeric default 1.0, -- 0.0 to 1.0
  source text check (source in ('photo', 'receipt', 'manual')),
  last_confirmed_at timestamptz default now(),
  expires_at timestamptz,
  created_at timestamptz default now()
);

alter table chef_inventory_items enable row level security;

-- User owns their inventory
create policy "Users can manage their own inventory" 
  on chef_inventory_items for all 
  using (auth.uid() = owner_user_id);

-- 3. Recipe Intelligence
create table if not exists chef_recipes (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  cuisine text,
  prep_minutes integer,
  cook_minutes integer,
  energy_profile text, -- e.g. 'high-protein', 'quick-fuel'
  instructions jsonb, -- Structured steps
  created_at timestamptz default now()
);

alter table chef_recipes enable row level security;

-- Public read access for recurring system recipes (for now)
create policy "Recipes are viewable by everyone" 
  on chef_recipes for select 
  using (true);

-- 4. Recipe <-> Ingredient Mapping
create table if not exists chef_recipe_ingredients (
  recipe_id uuid references chef_recipes(id) on delete cascade,
  ingredient_id uuid references chef_ingredients(id) on delete cascade,
  required boolean default true,
  substitute_group text, -- e.g. 'acid', 'fat'
  primary key (recipe_id, ingredient_id)
);

alter table chef_recipe_ingredients enable row level security;

create policy "Recipe ingredients are viewable by everyone" 
  on chef_recipe_ingredients for select 
  using (true);

-- 5. Grocery Vendor Profiles
create table if not exists chef_grocery_vendors (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  supports_deeplink boolean default false,
  supports_autoplace boolean default false,
  created_at timestamptz default now()
);

alter table chef_grocery_vendors enable row level security;

create policy "Vendors are viewable by everyone" 
  on chef_grocery_vendors for select 
  using (true);

-- 6. Order Drafts (Pre-Execution)
create table if not exists chef_order_drafts (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null references auth.users(id) on delete cascade,
  vendor_id uuid references chef_grocery_vendors(id),
  items jsonb, -- Snapshot of cart items
  estimated_total numeric,
  eta_minutes integer,
  status text check (status in ('draft', 'placed', 'cancelled')),
  created_at timestamptz default now()
);

alter table chef_order_drafts enable row level security;

create policy "Users can manage their own order drafts" 
  on chef_order_drafts for all 
  using (auth.uid() = owner_user_id);

-- INDEXES for Performance
create index if not exists idx_chef_inventory_owner on chef_inventory_items(owner_user_id);
create index if not exists idx_chef_order_drafts_owner on chef_order_drafts(owner_user_id);
create index if not exists idx_chef_recipe_ingredients_recipe on chef_recipe_ingredients(recipe_id);
