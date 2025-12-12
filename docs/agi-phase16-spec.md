# 🧠 PULSE OS — PHASE 16 MEGA SPEC

## Civilization Layer — Scoreboards, Ladders, & Pulse Nation

> **You are:** Senior Staff Engineer on Pulse OS (Next.js 16 + Supabase + TypeScript).

> **Goal:**

> Build the **Civilization Layer**:

>
> * Cross-user scoreboards (within jobs/verticals)

> * Ladders & tiers (rookie → legend)

> * Anonymous & opt-in public benchmarks

> * "Pulse Nation" views: how you stack vs peers, companies, industries

> * All with **strong privacy + data ownership protections**

Phases 1–15 are assumed to be in place:

* AGI Kernel + multi-agent mesh

* Vertical packs & jobs

* Household / org / team AGI

* Voice OS + mobile + calls

* Communication & Philosophy training

* Financial Brain & AI Accounting OS

---

# SECTION 0 — DESIGN PRINCIPLES

1. **Privacy-first, opt-in**:

   * No user is visible on public/industry scoreboards unless they explicitly opt-in.

   * Even then, display can be anonymized ("Loan Officer #842") unless they choose otherwise.

2. **Vertical-first**:

   * Scoreboards are based on **job vertical packs** (e.g., banking_lending, sales, dev, etc.).

3. **Skill & process, not outcomes only**:

   * Metrics emphasize **behaviors** and **quality** (pipeline hygiene, communication mastery, training progress), not just raw revenue.

4. **Seasonal ladders**:

   * Players advance through tiers and seasons (e.g., Q1 2026 ladder), not one static score forever.

5. **AGI-aware**:

   * AGI can use scoreboard positions to:

     * Motivate

     * Suggest goals

     * Offer targeted training to move tiers

---

# SECTION 1 — DATABASE LAYER

Create migrations in `/supabase/migrations/`.

## 1.1. Scoreboard & Leagues

Migration: `20260105_scoreboards_v1.sql`

```sql
-- ============================================
-- SCOREBOARDS & LEAGUES
-- ============================================

create table if not exists public.leagues (
  id uuid primary key default gen_random_uuid(),
  key text not null,             -- 'banking_lending_global', 'sales_core', etc.
  name text not null,
  description text,
  vertical_key text,             -- link to job_verticals or general vertical identifier
  scope text not null default 'global', -- 'global' | 'org' | 'household' | 'custom'
  org_id uuid references organizations(id),

  -- Seasonal / time-bounded league
  season_key text,               -- '2026_Q1', '2026', etc.
  started_at timestamptz not null,
  ends_at timestamptz,

  config jsonb not null default '{}'::jsonb, -- scoring formula, display rules

  created_at timestamptz not null default now()
);

create unique index if not exists leagues_key_season_unique
  on public.leagues(key, season_key);

create table if not exists public.league_members (
  id uuid primary key default gen_random_uuid(),
  league_id uuid not null references public.leagues(id) on delete cascade,
  user_id uuid not null references users(id) on delete cascade,

  -- Whether user allows public-ish display within this league
  display_mode text not null default 'anonymous', -- 'anonymous' | 'handle' | 'full_name'
  public_handle text,          -- e.g. 'LoanTitan42'

  created_at timestamptz not null default now()
);

create unique index if not exists league_members_unique
  on public.league_members(league_id, user_id);

create index if not exists league_members_league_idx
  on public.league_members(league_id);

create table if not exists public.league_scores (
  id uuid primary key default gen_random_uuid(),
  league_id uuid not null references public.leagues(id) on delete cascade,
  user_id uuid not null references users(id) on delete cascade,

  -- Aggregated numeric score for ranking
  score numeric not null default 0,
  tier text,                     -- 'bronze', 'silver', 'gold', 'platinum', 'legend'
  rank int,

  -- Breakdown of components for transparency
  components jsonb not null default '{}'::jsonb,

  updated_at timestamptz not null default now()
);

create index if not exists league_scores_league_idx
  on public.league_scores(league_id);

create index if not exists league_scores_user_idx
  on public.league_scores(user_id);

create index if not exists league_scores_score_idx
  on public.league_scores(score desc);
```

---

## 1.2. User Civilization Settings

Migration: `20260105_civilization_settings_v1.sql`

```sql
-- ============================================
-- CIVILIZATION SETTINGS
-- User privacy and opt-in preferences
-- ============================================

create table if not exists public.civilization_settings (
  user_id uuid primary key references users(id) on delete cascade,

  -- Global opt-in to civilization features
  scoreboards_enabled boolean not null default false,

  -- Allow anonymous global ranking
  allow_anonymous_global boolean not null default false,

  -- Allow showing handle in rankings
  allow_handle_global boolean not null default false,

  public_handle text,           -- user-chosen gamertag/handle

  -- Per-vertical preferences (banking, sales, etc.)
  vertical_prefs jsonb not null default '{}'::jsonb,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
```

`vertical_prefs` example:

```json
{
  "banking_lending": { "enabled": true, "league_keys": ["banking_lending_global"] },
  "sales": { "enabled": false }
}
```

---

## 1.3. Aggregated Vertical Metrics

Migration: `20260105_vertical_aggregates_v1.sql`

```sql
-- ============================================
-- VERTICAL METRICS AGGREGATES
-- Period-based metrics for scoring
-- ============================================

create table if not exists public.vertical_metrics (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  vertical_key text not null,       -- 'banking_lending', 'sales', etc.

  period_start date not null,
  period_end date not null,

  -- Aggregated metrics, vertical-specific but normalized (score 0-100)
  metrics jsonb not null,           -- { "pipeline_hygiene": 85, "activity_volume": 70, ... }

  created_at timestamptz not null default now()
);

create index if not exists vertical_metrics_user_vertical_idx
  on public.vertical_metrics(user_id, vertical_key);

create index if not exists vertical_metrics_period_idx
  on public.vertical_metrics(period_start, period_end);
```

---

# SECTION 2 — CIVILIZATION ENGINE MODULES

Create directory: `/lib/civilization/`.

## 2.1. `settings.ts`

Functions for managing civilization settings.

```ts
import { supabaseAdmin } from '@/lib/supabase';

async function resolveUserId(clerkId: string): Promise<string> {
  const { data: userRow } = await supabaseAdmin
    .from("users")
    .select("id")
    .eq("clerk_id", clerkId)
    .maybeSingle();

  return userRow?.id || clerkId;
}

export interface CivilizationSettings {
  user_id: string;
  scoreboards_enabled: boolean;
  allow_anonymous_global: boolean;
  allow_handle_global: boolean;
  public_handle?: string;
  vertical_prefs: Record<string, any>;
}

export async function getCivilizationSettings(
  userId: string,
): Promise<CivilizationSettings | null> {
  const dbUserId = await resolveUserId(userId);

  const { data, error } = await supabaseAdmin
    .from('civilization_settings')
    .select('*')
    .eq('user_id', dbUserId)
    .maybeSingle();

  if (error) {
    console.error('[Civilization] Failed to load settings', error);
    return null;
  }

  if (!data) {
    // Create default settings
    const defaultSettings: CivilizationSettings = {
      user_id: dbUserId,
      scoreboards_enabled: false,
      allow_anonymous_global: false,
      allow_handle_global: false,
      vertical_prefs: {},
    };

    const { data: created } = await supabaseAdmin
      .from('civilization_settings')
      .insert(defaultSettings)
      .select('*')
      .single();

    return created as CivilizationSettings;
  }

  return data as CivilizationSettings;
}

export async function upsertCivilizationSettings(
  userId: string,
  patch: Partial<CivilizationSettings>,
): Promise<void> {
  const dbUserId = await resolveUserId(userId);

  const { error } = await supabaseAdmin
    .from('civilization_settings')
    .upsert(
      {
        user_id: dbUserId,
        ...patch,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id' },
    );

  if (error) {
    console.error('[Civilization] Failed to update settings', error);
    throw new Error('Failed to update civilization settings');
  }
}

export async function isUserScoreboardEligible(
  userId: string,
  verticalKey: string,
): Promise<boolean> {
  const settings = await getCivilizationSettings(userId);
  if (!settings || !settings.scoreboards_enabled) {
    return false;
  }

  const verticalPref = settings.vertical_prefs[verticalKey];
  if (!verticalPref || !verticalPref.enabled) {
    return false;
  }

  // Check AGI mode (should not be 'off')
  const { data: agiSettings } = await supabaseAdmin
    .from('user_agi_settings')
    .select('level')
    .eq('user_id', await resolveUserId(userId))
    .maybeSingle();

  if (agiSettings?.level === 'off') {
    return false;
  }

  return true;
}
```

---

## 2.2. `leagues.ts`

League management and seeding.

```ts
import { supabaseAdmin } from '@/lib/supabase';

export interface LeagueConfig {
  vertical_key: string;
  score_components: Record<string, number>; // weights sum to 1.0
  tier_thresholds: {
    bronze: number;
    silver: number;
    gold: number;
    platinum: number;
    legend: number;
  };
}

export interface League {
  id: string;
  key: string;
  name: string;
  description: string;
  vertical_key: string;
  scope: string;
  season_key: string;
  config: LeagueConfig;
}

export async function seedDefaultLeagues(): Promise<void> {
  const leagues = [
    {
      key: 'banking_lending_global',
      name: 'Banking & Lending Global',
      description: 'Global leaderboard for commercial lenders and loan officers',
      vertical_key: 'banking_lending',
      scope: 'global',
      season_key: '2026_Q1',
      started_at: new Date('2026-01-01').toISOString(),
      ends_at: new Date('2026-03-31').toISOString(),
      config: {
        vertical_key: 'banking_lending',
        score_components: {
          pipeline_hygiene: 0.3,
          activity_quality: 0.3,
          deal_velocity: 0.2,
          training_engagement: 0.2,
        },
        tier_thresholds: {
          bronze: 10,
          silver: 30,
          gold: 60,
          platinum: 80,
          legend: 95,
        },
      },
    },
    {
      key: 'sales_global',
      name: 'Sales Global',
      description: 'Global leaderboard for sales professionals',
      vertical_key: 'sales',
      scope: 'global',
      season_key: '2026_Q1',
      started_at: new Date('2026-01-01').toISOString(),
      ends_at: new Date('2026-03-31').toISOString(),
      config: {
        vertical_key: 'sales',
        score_components: {
          pipeline_coverage: 0.3,
          activity_consistency: 0.3,
          deal_velocity: 0.2,
          training_engagement: 0.2,
        },
        tier_thresholds: {
          bronze: 10,
          silver: 30,
          gold: 60,
          platinum: 80,
          legend: 95,
        },
      },
    },
  ];

  for (const league of leagues) {
    await supabaseAdmin
      .from('leagues')
      .upsert(league, { onConflict: 'key,season_key' });
  }
}

export async function getActiveLeaguesForVertical(
  verticalKey: string,
): Promise<League[]> {
  const now = new Date().toISOString();

  const { data, error } = await supabaseAdmin
    .from('leagues')
    .select('*')
    .eq('vertical_key', verticalKey)
    .lte('started_at', now)
    .or(`ends_at.is.null,ends_at.gte.${now}`);

  if (error) {
    console.error('[Civilization] Failed to load leagues', error);
    return [];
  }

  return (data || []).map((row) => ({
    id: row.id,
    key: row.key,
    name: row.name,
    description: row.description,
    vertical_key: row.vertical_key,
    scope: row.scope,
    season_key: row.season_key,
    config: row.config as LeagueConfig,
  }));
}

export async function ensureUserInLeague(
  userId: string,
  leagueKey: string,
): Promise<void> {
  const dbUserId = await resolveUserId(userId);

  // Get league
  const { data: league } = await supabaseAdmin
    .from('leagues')
    .select('id')
    .eq('key', leagueKey)
    .maybeSingle();

  if (!league) {
    throw new Error('League not found');
  }

  // Check if already member
  const { data: existing } = await supabaseAdmin
    .from('league_members')
    .select('id')
    .eq('league_id', league.id)
    .eq('user_id', dbUserId)
    .maybeSingle();

  if (existing) {
    return; // Already a member
  }

  // Get user's display preferences
  const { data: settings } = await supabaseAdmin
    .from('civilization_settings')
    .select('public_handle, allow_anonymous_global, allow_handle_global')
    .eq('user_id', dbUserId)
    .maybeSingle();

  const displayMode = settings?.allow_handle_global && settings?.public_handle
    ? 'handle'
    : 'anonymous';

  // Add member
  const { error } = await supabaseAdmin.from('league_members').insert({
    league_id: league.id,
    user_id: dbUserId,
    display_mode: displayMode,
    public_handle: settings?.public_handle || null,
  });

  if (error) {
    console.error('[Civilization] Failed to add league member', error);
    throw new Error('Failed to join league');
  }
}

async function resolveUserId(clerkId: string): Promise<string> {
  const { data: userRow } = await supabaseAdmin
    .from("users")
    .select("id")
    .eq("clerk_id", clerkId)
    .maybeSingle();

  return userRow?.id || clerkId;
}
```

---

## 2.3. `scoring.ts`

Score computation and ranking.

```ts
import { supabaseAdmin } from '@/lib/supabase';
import { LeagueConfig } from './leagues';

async function resolveUserId(clerkId: string): Promise<string> {
  const { data: userRow } = await supabaseAdmin
    .from("users")
    .select("id")
    .eq("clerk_id", clerkId)
    .maybeSingle();

  return userRow?.id || clerkId;
}

export async function computeLeagueScore(
  userId: string,
  leagueId: string,
): Promise<{ score: number; components: Record<string, number>; tier: string }> {
  const dbUserId = await resolveUserId(userId);

  // Get league config
  const { data: league } = await supabaseAdmin
    .from('leagues')
    .select('config, season_key, started_at, ends_at')
    .eq('id', leagueId)
    .single();

  if (!league) {
    throw new Error('League not found');
  }

  const config = league.config as LeagueConfig;
  const periodStart = league.started_at.split('T')[0];
  const periodEnd = league.ends_at ? league.ends_at.split('T')[0] : new Date().toISOString().split('T')[0];

  // Get vertical metrics for this period
  const { data: metrics } = await supabaseAdmin
    .from('vertical_metrics')
    .select('metrics')
    .eq('user_id', dbUserId)
    .eq('vertical_key', config.vertical_key)
    .gte('period_end', periodStart)
    .lte('period_start', periodEnd)
    .order('period_end', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!metrics) {
    return { score: 0, components: {}, tier: 'bronze' };
  }

  const metricValues = metrics.metrics as Record<string, number>;

  // Compute weighted score
  let totalScore = 0;
  const components: Record<string, number> = {};

  for (const [component, weight] of Object.entries(config.score_components)) {
    const value = metricValues[component] || 0;
    const weighted = value * weight;
    totalScore += weighted;
    components[component] = value;
  }

  // Determine tier
  const thresholds = config.tier_thresholds;
  let tier = 'bronze';
  if (totalScore >= thresholds.legend) tier = 'legend';
  else if (totalScore >= thresholds.platinum) tier = 'platinum';
  else if (totalScore >= thresholds.gold) tier = 'gold';
  else if (totalScore >= thresholds.silver) tier = 'silver';

  return { score: totalScore, components, tier };
}

export async function recomputeLeagueScores(leagueId: string): Promise<void> {
  // Get league config
  const { data: league } = await supabaseAdmin
    .from('leagues')
    .select('id, config')
    .eq('id', leagueId)
    .single();

  if (!league) {
    throw new Error('League not found');
  }

  // Get all members
  const { data: members } = await supabaseAdmin
    .from('league_members')
    .select('user_id')
    .eq('league_id', leagueId);

  if (!members || members.length === 0) {
    return;
  }

  // Compute scores for all members
  const scores: Array<{ userId: string; score: number; components: any; tier: string }> = [];

  for (const member of members) {
    try {
      const result = await computeLeagueScore(member.user_id, leagueId);
      scores.push({
        userId: member.user_id,
        score: result.score,
        components: result.components,
        tier: result.tier,
      });
    } catch (err) {
      console.error(`[Civilization] Failed to compute score for user ${member.user_id}`, err);
    }
  }

  // Sort by score descending
  scores.sort((a, b) => b.score - a.score);

  // Update league_scores with rank
  for (let i = 0; i < scores.length; i++) {
    const entry = scores[i];
    const rank = i + 1;

    await supabaseAdmin
      .from('league_scores')
      .upsert(
        {
          league_id: leagueId,
          user_id: entry.userId,
          score: entry.score,
          tier: entry.tier,
          rank,
          components: entry.components,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'league_id,user_id' },
      );
  }
}
```

---

# SECTION 3 — INTEGRATION WITH EXISTING ENGINES

## 3.1. Vertical Metrics Aggregation

Create: `/lib/verticals/metrics_aggregator.ts`

```ts
import { supabaseAdmin } from '@/lib/supabase';

async function resolveUserId(clerkId: string): Promise<string> {
  const { data: userRow } = await supabaseAdmin
    .from("users")
    .select("id")
    .eq("clerk_id", clerkId)
    .maybeSingle();

  return userRow?.id || clerkId;
}

export async function computeVerticalMetrics(
  userId: string,
  verticalKey: string,
  periodStart: string,
  periodEnd: string,
): Promise<Record<string, number>> {
  const dbUserId = await resolveUserId(userId);
  const metrics: Record<string, number> = {};

  if (verticalKey === 'banking_lending') {
    // Pipeline hygiene: % of deals with recent updates
    const { data: deals } = await supabaseAdmin
      .from('deals')
      .select('id, updated_at')
      .eq('user_id', dbUserId)
      .eq('status', 'active');

    const totalDeals = deals?.length || 0;
    const recentUpdates = deals?.filter((d) => {
      const updated = new Date(d.updated_at);
      const cutoff = new Date(periodEnd);
      cutoff.setDate(cutoff.getDate() - 7);
      return updated >= cutoff;
    }).length || 0;

    metrics.pipeline_hygiene = totalDeals > 0 ? (recentUpdates / totalDeals) * 100 : 0;

    // Activity quality: communication training sessions
    const { data: commSessions } = await supabaseAdmin
      .from('communication_sessions')
      .select('id')
      .eq('user_id', dbUserId)
      .gte('created_at', periodStart)
      .lte('created_at', periodEnd);

    metrics.activity_quality = Math.min((commSessions?.length || 0) * 10, 100);

    // Deal velocity: deals touched / period length
    const periodDays = Math.ceil(
      (new Date(periodEnd).getTime() - new Date(periodStart).getTime()) / (1000 * 60 * 60 * 24),
    );
    metrics.deal_velocity = Math.min((totalDeals / periodDays) * 30, 100);

    // Training engagement: philosophy exercises completed
    const { data: philosophyProgress } = await supabaseAdmin
      .from('user_philosophy_progress')
      .select('id')
      .eq('user_id', dbUserId)
      .eq('status', 'completed')
      .gte('completed_at', periodStart)
      .lte('completed_at', periodEnd);

    metrics.training_engagement = Math.min((philosophyProgress?.length || 0) * 5, 100);
  }

  // Normalize all metrics to 0-100
  for (const key in metrics) {
    metrics[key] = Math.max(0, Math.min(100, metrics[key]));
  }

  // Save to vertical_metrics
  await supabaseAdmin.from('vertical_metrics').insert({
    user_id: dbUserId,
    vertical_key: verticalKey,
    period_start: periodStart,
    period_end: periodEnd,
    metrics,
  });

  return metrics;
}
```

---

## 3.2. AGI Awareness of Civilization Layer

Update `lib/agi/worldstate.ts`:

```ts
// Add to WorldState interface
export interface WorldState {
  // ... existing fields ...
  civilization?: {
    leagues: {
      key: string;
      name: string;
      tier?: string;
      rank?: number;
      score?: number;
    }[];
    verticalMetrics?: {
      verticalKey: string;
      metrics: Record<string, number>;
    }[];
  };
}

// In buildWorldState function, add:
import { getCivilizationSettings, isUserScoreboardEligible } from '@/lib/civilization/settings';
import { getActiveLeaguesForVertical } from '@/lib/civilization/leagues';
import { supabaseAdmin } from '@/lib/supabase';

// Inside buildWorldState:
const civSettings = await getCivilizationSettings(userId);
if (civSettings?.scoreboards_enabled) {
  const verticalPacks = await getUserVerticalPacks(userId);
  const leagues: any[] = [];
  const verticalMetrics: any[] = [];

  for (const pack of verticalPacks) {
    if (await isUserScoreboardEligible(userId, pack.jobTitle)) {
      const activeLeagues = await getActiveLeaguesForVertical(pack.jobTitle);
      for (const league of activeLeagues) {
        const { data: score } = await supabaseAdmin
          .from('league_scores')
          .select('score, tier, rank')
          .eq('league_id', league.id)
          .eq('user_id', await resolveUserId(userId))
          .maybeSingle();

        leagues.push({
          key: league.key,
          name: league.name,
          tier: score?.tier,
          rank: score?.rank,
          score: score?.score,
        });
      }

      // Get latest metrics
      const { data: metrics } = await supabaseAdmin
        .from('vertical_metrics')
        .select('metrics')
        .eq('user_id', await resolveUserId(userId))
        .eq('vertical_key', pack.jobTitle)
        .order('period_end', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (metrics) {
        verticalMetrics.push({
          verticalKey: pack.jobTitle,
          metrics: metrics.metrics,
        });
      }
    }
  }

  world.civilization = {
    leagues,
    verticalMetrics,
  };
}
```

---

# SECTION 4 — API LAYER

## 4.1. Civilization Settings API

`app/api/civilization/settings/route.ts`:

```ts
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import {
  getCivilizationSettings,
  upsertCivilizationSettings,
} from '@/lib/civilization/settings';

export async function GET(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const settings = await getCivilizationSettings(userId);
    return NextResponse.json({ settings });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const body = await req.json();
    await upsertCivilizationSettings(userId, body);

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
```

---

## 4.2. League View API

`app/api/civilization/leagues/route.ts`:

```ts
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { getActiveLeaguesForVertical } from '@/lib/civilization/leagues';
import { getUserVerticalPacks } from '@/lib/verticals/generator';
import { isUserScoreboardEligible } from '@/lib/civilization/settings';

export async function GET(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const verticalPacks = await getUserVerticalPacks(userId);
    const leagues: any[] = [];

    for (const pack of verticalPacks) {
      if (await isUserScoreboardEligible(userId, pack.jobTitle)) {
        const activeLeagues = await getActiveLeaguesForVertical(pack.jobTitle);
        leagues.push(...activeLeagues);
      }
    }

    return NextResponse.json({ leagues });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
```

`app/api/civilization/league/[leagueId]/standings/route.ts`:

```ts
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { supabaseAdmin } from '@/lib/supabase';

async function resolveUserId(clerkId: string): Promise<string> {
  const { data: userRow } = await supabaseAdmin
    .from("users")
    .select("id")
    .eq("clerk_id", clerkId)
    .maybeSingle();

  return userRow?.id || clerkId;
}

export async function GET(
  req: NextRequest,
  { params }: { params: { leagueId: string } },
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const { data: scores } = await supabaseAdmin
      .from('league_scores')
      .select(`
        *,
        league_members!inner (display_mode, public_handle)
      `)
      .eq('league_id', params.leagueId)
      .order('score', { ascending: false })
      .limit(100);

    // Sanitize for display
    const sanitized = (scores || []).map((score: any) => {
      const member = score.league_members;
      let displayName = 'Anonymous';

      if (member.display_mode === 'handle' && member.public_handle) {
        displayName = member.public_handle;
      } else if (member.display_mode === 'full_name') {
        // Only if explicitly allowed and safe
        displayName = 'Member'; // Placeholder - would need user lookup
      } else {
        displayName = `Member #${score.rank || '?'}`;
      }

      return {
        rank: score.rank,
        tier: score.tier,
        score: Math.round(score.score),
        displayName,
        components: score.components,
      };
    });

    return NextResponse.json({ standings: sanitized });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
```

---

# SECTION 5 — UI: SCOREBOARDS & PULSE NATION

Create: `app/(authenticated)/civilization/hub/page.tsx`

```tsx
'use client';

import { useState, useEffect } from 'react';
import { AppCard } from '@/components/ui/AppCard';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';

export default function CivilizationHubPage() {
  const router = useRouter();
  const [leagues, setLeagues] = useState<any[]>([]);
  const [settings, setSettings] = useState<any>(null);
  const [metrics, setMetrics] = useState<any>(null);

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    const [leaguesRes, settingsRes] = await Promise.all([
      fetch('/api/civilization/leagues'),
      fetch('/api/civilization/settings'),
    ]);

    if (leaguesRes.ok) {
      const data = await leaguesRes.json();
      setLeagues(data.leagues || []);
    }

    if (settingsRes.ok) {
      const data = await settingsRes.json();
      setSettings(data.settings);
    }
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <h1 className="text-2xl font-bold text-white">Pulse Nation</h1>

      {!settings?.scoreboards_enabled && (
        <AppCard className="p-6 bg-yellow-900/30">
          <h2 className="text-xl font-semibold text-white mb-4">Join the Leaderboards</h2>
          <p className="text-white/80 mb-4">
            Opt in to see how you stack up against other professionals in your field.
          </p>
          <Button
            onClick={async () => {
              await fetch('/api/civilization/settings', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ scoreboards_enabled: true }),
              });
              fetchData();
            }}
          >
            Enable Scoreboards
          </Button>
        </AppCard>
      )}

      {settings?.scoreboards_enabled && (
        <>
          <AppCard className="p-6">
            <h2 className="text-xl font-semibold text-white mb-4">Your Status</h2>
            {leagues.length === 0 ? (
              <p className="text-white/60">No active leagues yet.</p>
            ) : (
              <div className="space-y-4">
                {leagues.map((league) => (
                  <div key={league.id} className="p-4 bg-black/30 rounded">
                    <h3 className="text-white font-medium">{league.name}</h3>
                    <p className="text-white/60 text-sm">{league.description}</p>
                    <Button
                      onClick={() => router.push(`/civilization/league/${league.id}`)}
                      size="sm"
                      className="mt-2"
                    >
                      View Standings
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </AppCard>
        </>
      )}
    </div>
  );
}
```

---

# SECTION 6 — VOICE & INTERACTION LAYER

## 6.1. Voice Intents

Update `lib/voice/intent_detector.ts`:

```ts
// Add civilization detection
if (
  lowerText.includes('rank') ||
  lowerText.includes('tier') ||
  lowerText.includes('scoreboard') ||
  lowerText.includes('compared to') ||
  lowerText.includes('leaderboard')
) {
  return {
    route: 'civilization',
    intent: extractCivilizationIntent(text),
  };
}
```

## 6.2. Voice Route: Civilization

Create: `lib/voice/routes/civilization.ts`

```ts
import { VoiceRouteResult } from '../router';
import { getCivilizationSettings } from '@/lib/civilization/settings';
import { getActiveLeaguesForVertical } from '@/lib/civilization/leagues';
import { getUserVerticalPacks } from '@/lib/verticals/generator';
import { supabaseAdmin } from '@/lib/supabase';

async function resolveUserId(clerkId: string): Promise<string> {
  const { data: userRow } = await supabaseAdmin
    .from("users")
    .select("id")
    .eq("clerk_id", clerkId)
    .maybeSingle();

  return userRow?.id || clerkId;
}

export async function handleCivilizationVoiceTurn(params: {
  userId: string;
  sessionId: string;
  text: string;
  intent: any;
}): Promise<VoiceRouteResult> {
  const settings = await getCivilizationSettings(params.userId);

  if (!settings?.scoreboards_enabled) {
    return {
      route: 'civilization',
      text: "You haven't opted into scoreboards yet. Go to Pulse Nation to enable them.",
    };
  }

  const verticalPacks = await getUserVerticalPacks(params.userId);
  if (verticalPacks.length === 0) {
    return {
      route: 'civilization',
      text: "You don't have any job verticals set up. Add your job to join leagues.",
    };
  }

  const primaryVertical = verticalPacks[0];
  const leagues = await getActiveLeaguesForVertical(primaryVertical.jobTitle);

  if (leagues.length === 0) {
    return {
      route: 'civilization',
      text: `No active leagues found for ${primaryVertical.jobTitle}.`,
    };
  }

  const league = leagues[0];
  const dbUserId = await resolveUserId(params.userId);

  const { data: score } = await supabaseAdmin
    .from('league_scores')
    .select('score, tier, rank')
    .eq('league_id', league.id)
    .eq('user_id', dbUserId)
    .maybeSingle();

  if (!score) {
    return {
      route: 'civilization',
      text: `You're not ranked in ${league.name} yet. Keep using Pulse to build your score.`,
    };
  }

  return {
    route: 'civilization',
    text: `You're currently ${score.tier} tier, rank ${score.rank} in ${league.name}. Your score is ${Math.round(score.score)}.`,
  };
}
```

---

# SECTION 7 — PRIVACY & SAFETY RULES

Enforce **hard rules**:

1. Default: `scoreboards_enabled = false`.
2. No user appears in any league until they **explicitly opt in**.
3. Even when opt-in, default `display_mode='anonymous'` with generated label.
4. No sensitive data (name, company, exact financials, call transcripts, etc.) is exposed.
5. Scoreboard APIs and UI must be careful not to show exact counts of deals, revenue, or personally sensitive metrics — only normalized/relative metrics.

Include disclaimers in UI:

* "These rankings are **approximate performance indicators**, not legal/HR-grade performance reviews."
* "Pulse is a private training tool; use discretion before sharing rank details externally."

---

# SECTION 8 — ACCEPTANCE CRITERIA

Phase 16 is **complete** when:

### ✅ Scoreboards & Leagues

1. At least one **global vertical league** (e.g., `banking_lending_global`) is seeded with a current season.
2. Users can opt in/out via `civilization_settings`.
3. `league_scores` are computed for test users and tiers assigned.

### ✅ Civilization Hub

1. `/civilization/hub` shows:
   * Current leagues & tiers
   * Strengths & weaknesses
   * AGI suggestions for improvement

2. Users can click into a league and see sanitized standings.

### ✅ Voice & Coaching

1. User can ask via voice:
   * "How am I doing compared to other [role]?"
   * "What should I do to reach the next tier?"

…and receive coherent answers that tie into:
* Training
* Behaviors
* Vertical practices

### ✅ Privacy

1. No user appears on a public/global standings list without explicit opt-in.
2. Default display mode is anonymous; handles/full names only when user explicitly enables.
3. No PII or raw financial/call data leaks in scoreboard responses.

---

**End of spec.**


