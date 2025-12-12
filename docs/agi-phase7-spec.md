# 🧠 PULSE AGI — PHASE 7

## Modes • Entitlements • Onboarding • AGI Control UX

> **You are:** Senior Staff Engineer & AI Architect on Pulse OS (Next.js 16 + Supabase + TypeScript).

> **Goal:**

> Turn Pulse AGI from a raw engine into a **productized experience** with:

>
> * Clear **AGI modes** (Scout / Advisor / Chief of Staff / Operator Preview)

> * **Entitlements** that map to tiers (what features a user actually gets)

> * A guided **AGI Onboarding Wizard** for new users

> * A unified **AGI Control Panel** where users can see & shape how AGI runs their life

This sits on top of Phases 1–6 (Kernel, Mesh, Twin, Simulation, Machine Teaching, Guardrails, etc.).

---

## 0. CURRENT STATE ASSUMPTIONS

Before coding, confirm:

1. Back-end AGI stack is live:

   * `lib/agi/kernel.ts`, `worldstate.ts`, `planner.ts`

   * `lib/agi/agents/*` (multi-agent mesh + self-tuning)

   * `lib/agi/digital_twin/*`

   * `lib/agi/simulation/*`

   * `lib/agi/risk_opportunity/*`

   * `lib/agi/memory/*`

   * `lib/agi/evolution/engine.ts`

   * `lib/agi/policy/engine.ts`

   * `lib/agi/agents/self_tuning.ts`, `agents/profiles.ts`

   * `lib/agi/settings.ts` (AGIUserProfile)

   * `lib/agi/monitoring/daemon.ts`, `monitoring/rituals.ts`

2. DB tables exist:

   * `agi_runs`, `agi_actions`, `agi_policies`

   * `user_agi_settings`, `agi_user_profile`

   * `agi_agent_profiles`, `agi_daily_summaries`, `agi_agent_metrics`

   * `agi_goals`, `agi_goal_progress`

   * `agi_digital_twin`, `agi_twin_snapshots`

   * `agi_simulations`, `agi_risk_opportunity_maps`

   * `agi_feedback`, `agi_eval_*` (from Phase 6)

3. UI:

   * `/agi/command-center`

   * `/settings/agi`

   * (Optionally) `/agi/health` from Phase 6

You'll **layer** productization on top of this — no API regressions.

---

# PART 1 — AGI MODES (SCOUT / ADVISOR / CHIEF OF STAFF / OPERATOR PREVIEW)

We define four opinionated modes:

* **Scout** – Observe and surface insights. No actions.

* **Advisor** – Suggest actions & plans. No auto-execution.

* **Chief of Staff** – Suggest + auto-execute low-risk internal actions.

* **Operator Preview** – Like Chief of Staff but with more aggressive planning & simulations (still *no high-risk auto*).

### 1.1. DB: Modes Catalog + User Mode

Create migration:

`supabase/migrations/20251221_agi_modes_v1.sql`

```sql
-- ============================================
-- PULSE AGI MODES V1
-- ============================================

create table if not exists public.agi_modes (
  key text primary key, -- 'scout' | 'advisor' | 'chief_of_staff' | 'operator_preview'
  name text not null,
  description text,
  -- JSON template for default settings/profile/entitlements for this mode
  config jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

-- Extend user_agi_settings to include a mode
alter table public.user_agi_settings
  add column if not exists mode text not null default 'scout';
```

Seed `agi_modes` with four rows (either via SQL seed file or code):

Example `config` shape per mode:

```json
{
  "level": "assist",       // off | assist | autopilot
  "autonomy_style": "conservative",  // from agi_user_profile
  "default_rituals": {
    "morning": { "enabled": true },
    "midday": { "enabled": false },
    "evening": { "enabled": false },
    "weekly": { "enabled": true }
  },
  "capabilities": {
    "can_create_tasks": true,
    "can_log_insights": true,
    "can_run_simulations": false,
    "can_nudge_user": true
  }
}
```

Different per mode:

* **Scout**: `level='assist'`, `can_create_tasks=false`, `can_run_simulations=false`

* **Advisor**: `assist`, `can_create_tasks=true`, `can_run_simulations=true`

* **Chief of Staff**: `autopilot`, `can_create_tasks/log_insights/nudges`, `simulations=true`

* **Operator Preview**: `autopilot`, more aggressive rituals, simulations always on, but still only low-risk actions auto.

---

### 1.2. Mode Engine

Create:

`lib/agi/modes.ts`

```ts
import { supabaseAdmin } from '@/lib/supabase';
import { AGIUserProfile } from './settings';

export type AGIModeKey = 'scout' | 'advisor' | 'chief_of_staff' | 'operator_preview';

export interface AGIModeConfig {
  level: 'off' | 'assist' | 'autopilot';
  autonomy_style?: 'conservative' | 'balanced' | 'bold';
  default_rituals?: any;
  capabilities?: Record<string, boolean>;
}

export interface AGIMode {
  key: AGIModeKey;
  name: string;
  description?: string;
  config: AGIModeConfig;
}

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

export async function getAvailableModes(): Promise<AGIMode[]> {
  const { data, error } = await supabaseAdmin.from('agi_modes').select('*');
  if (error) {
    console.error('[AGI][Modes] Failed to load modes', error);
    return [];
  }
  return (data ?? []).map((row) => ({
    key: row.key,
    name: row.name,
    description: row.description,
    config: row.config as AGIModeConfig,
  }));
}

export async function getUserMode(userId: string): Promise<AGIModeKey> {
  const dbUserId = await resolveUserId(userId);
  const { data, error } = await supabaseAdmin
    .from('user_agi_settings')
    .select('mode')
    .eq('user_id', dbUserId)
    .maybeSingle();

  if (error) {
    console.error('[AGI][Modes] Failed to load user mode', error);
    return 'scout';
  }
  return (data?.mode as AGIModeKey) ?? 'scout';
}
```

---

### 1.3. Applying Modes to Settings & Profile

In `lib/agi/modes.ts`, add:

```ts
import { getAGIUserProfile, saveAGIUserProfile } from './settings';
import { getUserAGISettings } from './settings_user_agi'; // adjust to actual paths

export async function applyModeToUser(userId: string, modeKey: AGIModeKey): Promise<void> {
  const dbUserId = await resolveUserId(userId);
  const modes = await getAvailableModes();
  const mode = modes.find((m) => m.key === modeKey);
  if (!mode) {
    console.warn('[AGI][Modes] Mode not found, skipping apply', { userId, modeKey });
    return;
  }

  // Update user_agi_settings
  const { data: settings } = await supabaseAdmin
    .from('user_agi_settings')
    .select('*')
    .eq('user_id', dbUserId)
    .maybeSingle();

  const updatedSettings = {
    level: mode.config.level,
    mode: modeKey,
    max_actions_per_run: settings?.max_actions_per_run || 10,
    max_runs_per_day: settings?.max_runs_per_day || 12,
    require_confirmation_for_high_impact: settings?.require_confirmation_for_high_impact ?? true,
  };

  const { error: settingsError } = await supabaseAdmin
    .from('user_agi_settings')
    .upsert({
      user_id: dbUserId,
      ...updatedSettings,
      last_updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id' });

  if (settingsError) {
    console.error('[AGI][Modes] Failed to update settings', settingsError);
  }

  // Update agi_user_profile (autonomy_style, rituals, capabilities)
  const profile = await getAGIUserProfile(userId);
  const updatedProfile = {
    ...profile,
    autonomy_style: mode.config.autonomy_style ?? profile.autonomy_style,
    rituals: mode.config.default_rituals ?? profile.rituals,
    capabilities: {
      ...(profile.capabilities ?? {}),
      ...(mode.config.capabilities ?? {}),
    },
  };
  await saveAGIUserProfile(userId, updatedProfile);
}
```

---

### 1.4. Mode API

Create:

`app/api/agi/mode/route.ts`

* `GET` – current mode + available modes.

* `POST` – set mode (if allowed by entitlements, see Part 2).

```ts
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { getAvailableModes, getUserMode, applyModeToUser } from '@/lib/agi/modes';
import { userHasEntitlementForMode } from '@/lib/agi/entitlements';

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

export async function GET(req: NextRequest) {
  try {
    const { userId: clerkId } = await auth();
    if (!clerkId) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const [currentMode, modes] = await Promise.all([
      getUserMode(clerkId),
      getAvailableModes(),
    ]);

    return NextResponse.json({ currentMode, modes });
  } catch (err: any) {
    console.error('[AGI][Mode] GET error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { userId: clerkId } = await auth();
    if (!clerkId) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const body = await req.json();
    const modeKey = body.mode as any;

    const allowed = await userHasEntitlementForMode(clerkId, modeKey);
    if (!allowed) {
      return new NextResponse('Forbidden', { status: 403 });
    }

    await applyModeToUser(clerkId, modeKey);
    return NextResponse.json({ ok: true });
  } catch (err: any) {
    console.error('[AGI][Mode] POST error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
```

(We'll define `userHasEntitlementForMode` in the entitlements module.)

---

# PART 2 — AGI ENTITLEMENTS (TIER / FEATURE GATING)

We need a clean layer that says:

> "This user can use X, Y, Z AGI capabilities because of their plan/tier/role."

### 2.1. DB: Entitlements

Create migration:

`supabase/migrations/20251222_agi_entitlements_v1.sql`

```sql
-- ============================================
-- PULSE AGI ENTITLEMENTS V1
-- ============================================

create table if not exists public.agi_entitlements (
  user_id uuid primary key references users(id) on delete cascade,

  -- Simple boolean flags for now; can grow as needed.
  can_use_simulation boolean not null default false,
  can_use_digital_twin boolean not null default false,
  can_use_multi_scenario boolean not null default false,
  can_use_autopilot boolean not null default false,
  can_use_operator_mode boolean not null default false,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
```

Later you can sync this from Stripe or another billing system.

---

### 2.2. Entitlements Module

Create:

`lib/agi/entitlements.ts`

```ts
import { supabaseAdmin } from '@/lib/supabase';
import { AGIModeKey } from './modes';

export interface AGIEntitlements {
  can_use_simulation: boolean;
  can_use_digital_twin: boolean;
  can_use_multi_scenario: boolean;
  can_use_autopilot: boolean;
  can_use_operator_mode: boolean;
}

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

export async function getUserEntitlements(userId: string): Promise<AGIEntitlements> {
  const dbUserId = await resolveUserId(userId);
  const { data, error } = await supabaseAdmin
    .from('agi_entitlements')
    .select('*')
    .eq('user_id', dbUserId)
    .maybeSingle();

  if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
    console.error('[AGI][Entitlements] Failed to load', error);
  }

  return {
    can_use_simulation: data?.can_use_simulation ?? false,
    can_use_digital_twin: data?.can_use_digital_twin ?? false,
    can_use_multi_scenario: data?.can_use_multi_scenario ?? false,
    can_use_autopilot: data?.can_use_autopilot ?? false,
    can_use_operator_mode: data?.can_use_operator_mode ?? false,
  };
}

export async function userHasEntitlementForMode(
  userId: string,
  mode: AGIModeKey,
): Promise<boolean> {
  const entitlements = await getUserEntitlements(userId);

  if (mode === 'chief_of_staff') {
    return entitlements.can_use_autopilot;
  }
  if (mode === 'operator_preview') {
    return entitlements.can_use_operator_mode && entitlements.can_use_autopilot;
  }

  // scout & advisor are always allowed
  return true;
}
```

Also integrate entitlements into:

* Simulation endpoints (only run if `can_use_simulation`).

* Digital twin/simulation UI (hide or show based on entitlements).

* Executor: even if mode is autopilot, require `can_use_autopilot` to auto-execute.

---

# PART 3 — AGI ONBOARDING WIZARD (FIRST-RUN EXPERIENCE)

We want a **guided 5–10 minute path** for new users:

1. Choose AGI mode

2. Choose focus domains

3. Set comfort level with autonomy

4. Configure rituals

5. Confirm safety/policy boundaries

### 3.1. Route & Shell

Create:

`app/(authenticated)/agi/onboarding/page.tsx`

* Use your existing design system (cards, steps, buttons).

* Steps:

  1. **Welcome + Modes**

     * Show cards for Scout / Advisor / Chief of Staff / Operator Preview.

     * Allow selection (only show Operator if entitlements allow).

     * On Next: call `POST /api/agi/mode`.

  2. **Focus Domains**

     * Toggles/checkboxes:

       * Work / Deals / Career

       * Finances

       * Relationships

       * Health / Habits

       * Household / Life Admin

     * Save to `agi_user_profile.domains` (or `focus_areas`).

  3. **Autonomy & Comfort**

     * Slider or radios:

       * "Just observe" (Scout-like)

       * "Advise me" (Advisor)

       * "Help execute low-risk stuff" (Chief of Staff)

     * This maps to:

       * `autonomy_style` in profile

       * Maybe adjust `user_agi_settings.level` if they pick more/less.

  4. **Rituals Setup**

     * Ask for:

       * Morning check-in time

       * Weekly review day/time

     * Save to `agi_user_profile.rituals`.

  5. **Confirm Safety Contract**

     * Show key policy bullets:

       * No sexual content

       * No moving money

       * No deleting data

       * No sending emails without confirmation

     * Require checkbox to proceed.

  6. **Done**

     * Optionally trigger a first AGI run (e.g., "Scout scan") or schedule first morning ritual.

Use `fetch("/api/agi/profile")`, `/api/agi/mode`, etc. to persist.

---

### 3.2. First-Run Flag

In `agi_user_profile` or `user_agi_settings`, ensure there is a flag or detect:

* If mode is unset or still default `'scout'` and `profile.onboarding_completed` is false → redirect to `/agi/onboarding` when they open `/agi/command-center` for the first time.

You can implement:

* `profile.onboarding_completed:boolean` in `agi_user_profile` JSON.

Set it to `true` at the final step of onboarding (via `/api/agi/profile` update).

---

# PART 4 — UNIFIED AGI CONTROL PANEL UX

We want one place for users to:

* See their mode

* See what AGI is allowed to do

* See what AGI has been doing

* Change AGI behavior

We already have `/agi/command-center`. Extend it into a **tabbed** or **sectioned** layout:

### 4.1. Sections

On `/agi/command-center`:

1. **Overview**

   * Current mode (with description).

   * Current entitlements (e.g., "Simulations enabled", "Autopilot off").

   * Quick toggles:

     * Turn AGI off/on (mapped to `user_agi_settings.level`).

     * Switch AGI mode via `/api/agi/mode`.

   * Short summary of:

     * Last AGI run

     * Last weekly review

2. **Activity**

   * Existing runs list/details view (Phase 1–4).

   * Feedback buttons (from Phase 6) for actions.

3. **Simulation / Trajectory**

   * Digital twin summary.

   * Simulation comparisons (current vs AGI plan, etc.).

   * Risk/Opportunity map summary.

4. **Teaching & Safety**

   * A list of recent feedback user gave.

   * A brief "Your safety contract" section pulling from policy engine (read-only).

   * Links to detailed safety / policies page.

5. **Settings**

   * Mode selector (Scout / Advisor / Chief etc.).

   * Autonomy style (conservative/balanced/bold).

   * Ritual toggles/times.

   * Domain focus toggles.

You don't need to over-animate — just clean, clear sections that map directly to the backend you've already built.

---

### 4.2. "AGI Status Badge"

Optional but powerful: Create a small component used across Pulse:

`components/agi/StatusBadge.tsx`

* Shows:

  * Mode icon & label (Scout / Advisor / CoS / Operator).

  * Current level (Off / Assist / Autopilot).

* When clicked:

  * Opens `/agi/command-center` or a small quick-control popover.

Use it in:

* Main dashboard

* Header

* Settings page

So AGI feels like a **system-level presence**, not just "a page."

---

# PART 5 — SUCCESS CRITERIA FOR PHASE 7

Phase 7 is **done** when:

### ✅ Modes

* `agi_modes` table is seeded with 4 modes.

* `user_agi_settings.mode` correctly reflects the user's choice.

* Applying a mode updates:

  * `user_agi_settings.level`

  * `agi_user_profile.autonomy_style`

  * `agi_user_profile.rituals` (defaults, if not customized)

  * `agi_user_profile.capabilities` (merged)

### ✅ Entitlements

* `agi_entitlements` exists and is read by:

  * `/api/agi/mode` (mode changes)

  * Simulation / Twin features (blocked for users without entitlements)

  * Autopilot execution (requires `can_use_autopilot` in addition to level=autopilot).

### ✅ Onboarding Wizard

* New users (or those without completed onboarding) are guided through:

  * Mode selection

  * Focus domains

  * Autonomy comfort

  * Ritual times

  * Safety confirmation

* At the end:

  * Profile + settings updated

  * `onboarding_completed` (or equivalent flag) set.

### ✅ AGI Control Panel

* `/agi/command-center` clearly shows:

  * Current mode & level

  * High-level summary of what AGI is allowed to do

  * Recent activity and key strategic outputs

* User can:

  * Change modes.

  * Toggle AGI off/assist/autopilot.

  * Adjust rituals & focus via the UI (or links to `/settings/agi`).

### ✅ Behavior

* A "Scout mode" user:

  * Sees insights and suggestions only; no auto-executed actions.

* An "Advisor mode" user:

  * Gets strategic proposals & plans but still no autopilot.

* A "Chief of Staff" user with entitlements:

  * Actually experiences AGI auto-creating tasks/insights in a controlled, low-risk way.

* Operator mode is gated by entitlements and feels like an "early access / power user" setting.

---

That's Claude's **next job**: Phase 7 — making Pulse's insane AGI engine feel like a clean, understandable, sellable product.

**End of spec.**


