# 🧠 PULSE AGI — PHASE 11

## Mobile App Shell + Call Overlay + Live Call Intelligence

> **You are:** Senior Staff Engineer on Pulse OS (Next.js 16 + Supabase + TypeScript).

> **Goal:**

>
> 1. Stand up a **mobile-ready surface** for Pulse (iOS/Android via React Native / Expo) that talks to the existing Next.js + Supabase backend.

> 2. Implement a **Call Intelligence Overlay**: Pulse can listen (with consent), transcribe, summarize, tag deals/contacts, and create tasks/memos automatically.

> 3. Integrate calls with **Voice OS + AGI Kernel + Job Vertical packs (esp. Banking)** so calls become AGI fuel, not chaos.



We stay vendor-agnostic (Twilio/Vonage/etc.), but build a **telephony layer abstraction** so you can plug in any provider.

---

## 0. ASSUMPTIONS

Before coding, confirm:

1. Backend:

   * Next.js 16 App Router

   * Supabase in place; tables for:

     * `voice_sessions`, `voice_turns` (Phase 9)

     * `agi_runs`, `agi_actions`, `agi_user_profile`, `user_agi_settings`

     * `job_verticals`, `jobs`, `user_jobs`

     * `deals` + banking overlays (`banking_deal_profiles`, etc.)

     * `relationships` / `contacts` tables of some kind

2. Voice:

   * `/api/voice/session` and `/api/voice/utterance` exist.

   * `lib/voice/router.ts` + `lib/voice/routes/*` exist.

3. AGI:

   * `runAGIKernel(userId, trigger)` works and logs runs.

   * Banking agents (Phase 10) exist for lending users.

We **do not** replace backend. We add:

* Mobile-facing API polish.

* New call-specific tables & endpoints.

* A mobile app shell (React Native / Expo) that hits those APIs.

---

# 🅰️ SPRINT A — CALL INTELLIGENCE DATA MODEL

We first give Pulse a **call memory**.

### A.1. Supabase: Call Sessions, Segments, Summaries

Create migration:

`supabase/migrations/20251229_call_intelligence_v1.sql`

```sql
-- ============================================
-- PULSE CALL INTELLIGENCE V1
-- Call sessions, segments, transcripts, summaries
-- ============================================

create table if not exists public.call_sessions (
  id uuid primary key default gen_random_uuid(),

  user_id uuid not null references users(id) on delete cascade,

  -- Optional link to org/workspace
  org_id uuid references public.organizations(id),

  -- For mobile calls: phone number(s).
  from_number text,
  to_number text,

  -- Optional correlation ID from telephony provider
  provider text,
  provider_call_id text,

  -- 'inbound' | 'outbound'
  direction text not null default 'outbound',

  started_at timestamptz not null,
  ended_at timestamptz,

  -- Whether user explicitly consented to call intelligence on this call
  consent_given boolean not null default false,

  -- High-level classification: 'sales', 'deal_review', 'relationship', etc.
  label text,

  created_at timestamptz not null default now()
);

create index if not exists call_sessions_user_id_idx
  on public.call_sessions(user_id);

create index if not exists call_sessions_provider_call_id_idx
  on public.call_sessions(provider_call_id);

create table if not exists public.call_segments (
  id uuid primary key default gen_random_uuid(),
  call_id uuid not null references public.call_sessions(id) on delete cascade,

  -- Segments let us chunk the call for partial transcripts/analysis
  segment_index int not null,

  -- 'user' | 'counterparty' | 'system'
  speaker text not null,

  transcript text not null,

  started_at timestamptz,
  ended_at timestamptz,

  metadata jsonb not null default '{}'::jsonb,

  created_at timestamptz not null default now()
);

create index if not exists call_segments_call_id_idx
  on public.call_segments(call_id);

create table if not exists public.call_summaries (
  id uuid primary key default gen_random_uuid(),
  call_id uuid not null references public.call_sessions(id) on delete cascade,
  user_id uuid not null references users(id),

  -- "What happened?" summary
  high_level_summary text,

  -- "Key decisions, commitments"
  decisions jsonb not null default '[]'::jsonb,

  -- "Follow-up tasks" as structured items
  followups jsonb not null default '[]'::jsonb,

  -- "Entities mentioned" (deals, contacts, companies, etc.)
  entities jsonb not null default '[]'::jsonb,

  -- Raw LLM or analytic payload if needed
  raw jsonb not null default '{}'::jsonb,

  created_at timestamptz not null default now()
);

create index if not exists call_summaries_call_id_idx
  on public.call_summaries(call_id);
```

---

### A.2. Linking Calls to Deals & Contacts

Create migration:

`supabase/migrations/20251229_call_links_v1.sql`

```sql
-- ============================================
-- CALL LINKS: Deals / Contacts / Relationships
-- ============================================

create table if not exists public.call_links (
  id uuid primary key default gen_random_uuid(),
  call_id uuid not null references public.call_sessions(id) on delete cascade,

  -- Generic entity linking
  entity_type text not null,  -- 'deal' | 'contact' | 'company' | 'task'
  entity_id uuid not null,

  -- Confidence 0-1 of this association
  confidence numeric not null default 1.0,

  created_at timestamptz not null default now()
);

create index if not exists call_links_call_id_idx
  on public.call_links(call_id);

create index if not exists call_links_entity_idx
  on public.call_links(entity_type, entity_id);
```

Later, AGI can say: *"These 3 calls relate to Deal X"* or *"You haven't talked to this guarantor in 60 days."*

---

# 🅱️ SPRINT B — TELEPHONY ABSTRACTION & API

We don't pick a vendor; we design a **simple abstraction** that any provider can call.

### B.1. Telephony Provider Abstraction

Create:

`lib/telephony/types.ts`

```ts
export interface TelephonyCallEvent {
  provider: string;            // 'twilio', 'vonage', 'custom', etc.
  providerCallId: string;
  direction: 'inbound' | 'outbound';
  fromNumber: string;
  toNumber: string;
  timestamp: string;
  eventType: 'call_started' | 'call_ended' | 'segment';
  segment?: {
    speaker: 'user' | 'counterparty';
    transcript: string;
    startTime?: string;
    endTime?: string;
  };
}
```

Create:

`lib/telephony/handler.ts`

```ts
import { TelephonyCallEvent } from './types';
import { supabaseAdmin } from '@/lib/supabase';
import { getOrCreateCallSessionFromEvent, appendCallSegment } from './persistence';
import { maybeRunCallPostProcessing } from './post_processing';

export async function handleTelephonyEvent(
  userId: string,
  event: TelephonyCallEvent,
): Promise<void> {
  const call = await getOrCreateCallSessionFromEvent(userId, event);

  if (event.eventType === 'segment' && event.segment) {
    await appendCallSegment(call.id, event);
  }

  if (event.eventType === 'call_ended') {
    // Kick off async/queued post-processing: summarization, follow-ups, linking, etc.
    await maybeRunCallPostProcessing(userId, call.id);
  }
}
```

Create:

`lib/telephony/persistence.ts`

```ts
import { TelephonyCallEvent } from './types';
import { supabaseAdmin } from '@/lib/supabase';

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

export async function getOrCreateCallSessionFromEvent(
  userId: string,
  event: TelephonyCallEvent,
) {
  const dbUserId = await resolveUserId(userId);

  const { data: existing } = await supabaseAdmin
    .from('call_sessions')
    .select('*')
    .eq('user_id', dbUserId)
    .eq('provider', event.provider)
    .eq('provider_call_id', event.providerCallId)
    .maybeSingle();

  if (existing) return existing;

  const { data: inserted, error } = await supabaseAdmin
    .from('call_sessions')
    .insert({
      user_id: dbUserId,
      provider: event.provider,
      provider_call_id: event.providerCallId,
      from_number: event.fromNumber,
      to_number: event.toNumber,
      direction: event.direction,
      started_at: event.timestamp,
      consent_given: false, // will be updated based on user settings/explicit consent
    })
    .select('*')
    .single();

  if (error || !inserted) {
    throw new Error('[Telephony] Failed to create call_session');
  }

  return inserted;
}

export async function appendCallSegment(
  callId: string,
  event: TelephonyCallEvent,
) {
  // Determine next segment_index
  const { data: last } = await supabaseAdmin
    .from('call_segments')
    .select('segment_index')
    .eq('call_id', callId)
    .order('segment_index', { ascending: false })
    .limit(1)
    .maybeSingle();

  const nextIndex =
    typeof last?.segment_index === 'number' ? last.segment_index + 1 : 0;

  const seg = event.segment!;
  const { error } = await supabaseAdmin.from('call_segments').insert({
    call_id: callId,
    segment_index: nextIndex,
    speaker: seg.speaker,
    transcript: seg.transcript,
    started_at: seg.startTime ?? null,
    ended_at: seg.endTime ?? null,
    metadata: { provider: event.provider, providerCallId: event.providerCallId },
  });

  if (error) console.error('[Telephony] Failed to append call_segment', error);
}
```

---

### B.2. Telephony Webhook API

Create:

`app/api/telephony/webhook/route.ts`

* This is the endpoint your telephony provider hits with call events (after auth/verification).

```ts
import { NextRequest, NextResponse } from 'next/server';
import { handleTelephonyEvent } from '@/lib/telephony/handler';
import { resolveUserIdFromTelephonyPayload } from '@/lib/telephony/user_mapping';

export async function POST(req: NextRequest) {
  // TODO: validate provider signature, etc. (security)
  const body = await req.json();
  const provider = body.provider ?? 'unknown';

  // Map provider payload -> TelephonyCallEvent
  const event = mapProviderPayloadToTelephonyEvent(provider, body);

  const userId = await resolveUserIdFromTelephonyPayload(provider, body);
  if (!userId) {
    return new NextResponse('User not found', { status: 404 });
  }

  await handleTelephonyEvent(userId, event);

  return NextResponse.json({ ok: true });
}

// Implementation stub; vendor-specific mapping will be filled in later.
function mapProviderPayloadToTelephonyEvent(provider: string, body: any) {
  // TODO: transform provider-specific fields into TelephonyCallEvent structure
  // For now, assume the body already matches the TelephonyCallEvent for local testing.
  return body as any;
}
```

Create:

`lib/telephony/user_mapping.ts`:

* Maps e.g. `toNumber`/`fromNumber` → `user_id` based on a verified phone number table.

```ts
import { supabaseAdmin } from '@/lib/supabase';

export async function resolveUserIdFromTelephonyPayload(
  provider: string,
  body: any,
): Promise<string | null> {
  // Strategy 1: If provider sends a user_id or email, resolve via users table
  if (body.user_id) {
    const { data: user } = await supabaseAdmin
      .from('users')
      .select('clerk_id')
      .eq('id', body.user_id)
      .maybeSingle();
    return user?.clerk_id || null;
  }

  // Strategy 2: Map phone number to user (requires a verified_phone_numbers table or similar)
  const phoneNumber = body.toNumber || body.fromNumber;
  if (phoneNumber) {
    // TODO: Implement phone number -> user mapping
    // For now, return null
  }

  // Strategy 3: Use provider-specific auth token/header
  // TODO: Extract user from auth header if provider sends it

  return null;
}
```

---

# 🅲 SPRINT C — CALL → SUMMARY → AGI → TASKS

We want Pulse to:

1. Get the transcript.

2. Summarize + extract follow-ups/entities.

3. Create tasks, link to deals, log insights.

### C.1. Call Post-Processing

Create:

`lib/telephony/post_processing.ts`

```ts
import { supabaseAdmin } from '@/lib/supabase';
import { generateCallSummary } from './summary_llm';
import { linkCallEntities } from './entity_linking';
import { runAGIAutopilotForCall } from './agi_integration';

export async function maybeRunCallPostProcessing(
  userId: string,
  callId: string,
): Promise<void> {
  const dbUserId = await resolveUserId(userId);

  const { data: call } = await supabaseAdmin
    .from('call_sessions')
    .select('*')
    .eq('id', callId)
    .single();

  if (!call) return;

  if (!call.consent_given) {
    console.log('[Telephony] Skipping post-processing; no consent');
    return;
  }

  const { data: segments } = await supabaseAdmin
    .from('call_segments')
    .select('*')
    .eq('call_id', callId)
    .order('segment_index', { ascending: true });

  const summary = await generateCallSummary(userId, call, segments ?? []);
  const entities = await linkCallEntities(userId, call, segments ?? [], summary);

  await runAGIAutopilotForCall(userId, call, summary, entities);
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

### C.2. LLM Summary

`lib/telephony/summary_llm.ts`:

```ts
import { supabaseAdmin } from '@/lib/supabase';
import { callAI } from '@/lib/ai/call';

export interface CallSummary {
  high_level_summary: string;
  decisions: { text: string; context?: string }[];
  followups: { text: string; priority?: 'low' | 'medium' | 'high' }[];
  entities: { type: string; name: string; context?: string }[];
  raw: any;
}

export async function generateCallSummary(
  userId: string,
  call: any,
  segments: any[],
): Promise<CallSummary> {
  const transcript = segments.map((s) => `${s.speaker}: ${s.transcript}`).join('\n');

  const systemPrompt = `You are Pulse, an AI assistant analyzing a phone call transcript. Extract:
1. A high-level summary (2-3 sentences)
2. Key decisions made (array of { text, context })
3. Follow-up tasks/commitments (array of { text, priority })
4. Entities mentioned (deals, contacts, companies) - array of { type, name, context }

Respond with JSON only.`;

  const userPrompt = `Call Direction: ${call.direction}
From: ${call.from_number}
To: ${call.to_number}
Started: ${call.started_at}

Transcript:
${transcript}

Extract summary, decisions, followups, and entities.`;

  const result = await callAI({
    userId,
    model: 'gpt-4o-mini',
    systemPrompt,
    userPrompt,
    temperature: 0.3,
    maxTokens: 1500,
    feature: 'call_summary',
  });

  let parsed: CallSummary;
  if (result.success && result.content) {
    try {
      parsed = JSON.parse(result.content);
    } catch {
      // Fallback
      parsed = {
        high_level_summary: 'Call summary could not be parsed automatically.',
        decisions: [],
        followups: [],
        entities: [],
        raw: { transcriptSnippet: transcript.slice(0, 1000) },
      };
    }
  } else {
    parsed = {
      high_level_summary: 'Call summary generation failed.',
      decisions: [],
      followups: [],
      entities: [],
      raw: { transcriptSnippet: transcript.slice(0, 1000) },
    };
  }

  const dbUserId = await resolveUserId(userId);
  const { error } = await supabaseAdmin.from('call_summaries').insert({
    call_id: call.id,
    user_id: dbUserId,
    high_level_summary: parsed.high_level_summary,
    decisions: parsed.decisions,
    followups: parsed.followups,
    entities: parsed.entities,
    raw: parsed.raw,
  });

  if (error) console.error('[Telephony] Failed to save call_summary', error);

  return parsed;
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

### C.3. Entity Linking (Deals, Contacts)

`lib/telephony/entity_linking.ts`:

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

export async function linkCallEntities(
  userId: string,
  call: any,
  segments: any[],
  summary: any,
) {
  const dbUserId = await resolveUserId(userId);
  const links: { entity_type: string; entity_id: string; confidence: number }[] = [];

  // Strategy 1: Use phone numbers to match contacts
  if (call.to_number || call.from_number) {
    const phoneNumber = call.direction === 'outbound' ? call.to_number : call.from_number;
    // TODO: Match phone number to contacts table
    // For now, skip
  }

  // Strategy 2: Use entity names from summary to fuzzy-match deals/contacts
  const entities = summary.entities || [];
  for (const entity of entities) {
    if (entity.type === 'deal' && entity.name) {
      // Fuzzy search deals by name
      const { data: deals } = await supabaseAdmin
        .from('deals')
        .select('id')
        .eq('user_id', dbUserId)
        .ilike('name', `%${entity.name}%`)
        .limit(1);

      if (deals && deals.length > 0) {
        links.push({
          entity_type: 'deal',
          entity_id: deals[0].id,
          confidence: 0.7, // Fuzzy match, lower confidence
        });
      }
    }

    // Similar logic for contacts, companies, etc.
  }

  if (links.length > 0) {
    const rows = links.map((l) => ({
      call_id: call.id,
      entity_type: l.entity_type,
      entity_id: l.entity_id,
      confidence: l.confidence,
    }));
    const { error } = await supabaseAdmin.from('call_links').insert(rows);
    if (error) console.error('[Telephony] Failed to save call_links', error);
  }

  return links;
}
```

### C.4. Call → AGI Autopilot

`lib/telephony/agi_integration.ts`:

```ts
import { runAGIKernel } from '@/lib/agi/kernel';

export async function runAGIAutopilotForCall(
  userId: string,
  call: any,
  summary: any,
  entities: any[],
) {
  // Trigger AGI with a special trigger context
  await runAGIKernel(userId, {
    type: 'relationship_signal',
    source: 'call_post_processing',
    payload: {
      callId: call.id,
      summary,
      entities,
      direction: call.direction,
      fromNumber: call.from_number,
      toNumber: call.to_number,
    },
  });

  // AGI agents (relationship, work, banking, etc.) can:
  // - Create tasks for followups
  // - Log insights
  // - Update deals/relationships
}
```

This connects calls into the AGI brain.

---

# 🅳 SPRINT D — MOBILE API SURFACE & APP SHELL

Now we make Pulse usable on the phone.

### D.1. Mobile-Friendly API Endpoints

Ensure existing endpoints are mobile-safe (CORS, JSON, auth tokens).

Add a lightweight mobile API namespace for things you'll need in the app:

`app/api/mobile/home/route.ts`

Returns a compact snapshot:

```ts
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { buildWorldState } from '@/lib/agi/worldstate';

export async function GET(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const world = await buildWorldState(userId);

    // Return trimmed fields for mobile "Home" screen
    return NextResponse.json({
      time: {
        now: world.time.now,
        todayTasks: world.time.todayTasks?.slice(0, 10) || [],
        upcomingEvents: world.time.upcomingEvents?.slice(0, 5) || [],
      },
      work: {
        activeDealsCount: world.work?.activeDeals?.length ?? 0,
        keyDeadlines: world.work?.keyDeadlines?.slice(0, 5) || [],
      },
      relationships: {
        importantContacts: world.relationships?.importantContacts?.slice(0, 5) || [],
        checkinsDue: world.relationships?.checkinsDue?.slice(0, 5) || [],
      },
      finances: {
        upcomingBills: world.finances?.upcomingBills?.slice(0, 5) || [],
      },
      emotion: world.emotion,
    });
  } catch (err: any) {
    console.error('[Mobile][Home] Error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
```

Additional handy endpoints:

* `/api/mobile/calls` – list recent `call_sessions` + `call_summaries`.

* `/api/mobile/deals` – simplified deals list for quick access.

* `/api/mobile/tasks` – today's tasks.

### D.2. Mobile App Shell (React Native / Expo)

**Repo layout idea** (Claude can implement):

* `/mobile/` directory:

  * Expo React Native project using TypeScript.

  * Uses the same Supabase auth or token-based auth for APIs.

Core screens:

1. **Auth Screen**

   * Sign-in using email/password, magic link, or OAuth (whatever your backend supports).

   * Stores session token; uses it for API calls.

2. **Home Screen**

   * Calls `/api/mobile/home`.

   * Shows:

     * Today view (events, tasks).

     * AGI "Now" card (high-level nudge).

     * "Talk to Pulse" button.

3. **Talk to Pulse Screen**

   * Uses (for now) text-in, text-out tied to `/api/voice/session` & `/api/voice/utterance`.

   * Later, integrate device microphone + streaming.

4. **Calls Screen**

   * List `call_sessions` + summary snippet.

   * Tap into Call Detail screen.

5. **Call Detail Screen**

   * Shows date/time, counterparty, direction.

   * Summary section.

   * Follow-ups (generated tasks).

   * "Ask Pulse about this call" – uses voice/text to ask AGI.

6. **Deals / Work Screen** (especially for banking users)

   * List deals, open deal workspace (light mobile version).

Claude's job in the repo:

* Initialize `/mobile` Expo app.

* Create an `api.ts` helper that points at your Next.js backend.

* Implement above screens with navigation.

---

# 🅴 SPRINT E — IN-CALL OVERLAY UX (MOBILE)

We can't literally draw over the native phone app without OS-level entitlements, but we can:

* Provide a **"Call Companion"** flow:

  * User opens Pulse → taps "Start Call with Pulse Companion".

  * Pulse shows an in-app call screen with:

    * A "Start Call" button (deep-link to phone dialer / VOIP if integrated).

    * A "Listening" indicator.

    * A text area where live transcripts & AGI notes appear.

### E.1. Call Companion Screen

In mobile app:

* Screen: `CallCompanionScreen`.

Flow:

1. User selects a contact or types a number.

2. App calls backend endpoint:

   * `POST /api/mobile/call/prepare` with `{ toNumber, contextTag }`.

3. Backend:

   * Creates a `call_session` row with `started_at=now`, `consent_given=true` (since user explicitly turned it on).

   * Returns `callId` + maybe provider info for your telephony integration.

4. Mobile app:

   * Stores `callId`.

   * Launches native dialer or VOIP call.

5. During call:

   * Depending on telephony integration, transcript segments come in via `/api/telephony/webhook` and update DB.

   * Mobile app polls `/api/mobile/calls/[callId]/live` (simple GET) to show partial transcript & notes.

   * After call, mobile shows "Call Summary" view once `call_summaries` row exists.

Add endpoints:

`app/api/mobile/call/prepare/route.ts`

`app/api/mobile/calls/[callId]/live/route.ts`

### E.2. Live Notes & Nudge Panel

On `CallCompanionScreen`:

* Right side (or bottom) panel:

  * Shows:

    * Running transcript chunks (speaker-labeled).

    * A "Live Notes" card:

      * Key phrases or potential follow-ups as AGI hears them.

      * This can be done by calling a lightweight summarizer every N segments or after call end for v1.

* You can implement v1 as **post-call** only, then evolve to near-real-time.

---

# 🅵 SPRINT F — PRIVACY, CONSENT, & SAFETY

We must bake in **user control + consent tracking**.

### F.1. Per-User Call Intelligence Settings

Extend `agi_user_profile` or create:

`supabase/migrations/20251229_call_settings_v1.sql`

```sql
create table if not exists public.call_intelligence_settings (
  user_id uuid primary key references users(id) on delete cascade,

  enabled boolean not null default false,
  auto_consent_for_outbound boolean not null default false,
  auto_consent_for_inbound boolean not null default false,

  -- Per-region / compliance flags
  region text, -- 'US', 'EU', etc.

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
```

Add UI under `/settings/agi` or `/settings/calls`:

* Toggles:

  * "Enable Call Intelligence"

  * "Auto-enable on outbound calls"

  * "Auto-enable on inbound calls"

* Explain clearly:

  * User must comply with local laws (two-party consent, etc.).

  * Pulse is a *tool*, not a legal authority.

### F.2. Consent Handling Logic

In telephony handlers:

* When creating `call_sessions`:

  * Look up `call_intelligence_settings`:

    * If `enabled=false` → set `consent_given=false`.

    * If `enabled=true` and direction is outbound and `auto_consent_for_outbound=true` → set `consent_given=true`.

    * Similarly for inbound.

* Mobile "Call Companion" flow always sets `consent_given=true` because user explicitly engaged the feature.

**Post-processing MUST check `consent_given`** (we already did in `maybeRunCallPostProcessing`).

---

# ✅ PHASE 11 — DONE WHEN

### ✅ Data & Telephony

* `call_sessions`, `call_segments`, `call_summaries`, `call_links` exist and are populated during test calls.

* `/api/telephony/webhook` can accept a test payload and create:

  * A call session

  * 1+ segments

  * A call summary (LLM stub ok for v1)

### ✅ Call → AGI Integration

* After a call ends (test event):

  * `call_summaries` row exists.

  * `runAGIKernel` is triggered with a `relationship_signal` payload.

  * AGI agents can create tasks & insights based on summary / followups.

### ✅ Mobile App Shell

* `/mobile` app can:

  * Authenticate user.

  * Display a mobile Home screen from `/api/mobile/home`.

  * Show a list of recent calls from `/api/mobile/calls`.

  * Show call detail with summary once processed.

  * Provide a "Talk to Pulse" screen that goes through Voice OS pipeline.

### ✅ Call Companion UX

* In the mobile app, a "Call Companion" flow exists:

  * User can start a call session.

  * After call, they see a summary + suggested follow-ups in the app.

### ✅ Privacy / Consent Controls

* `call_intelligence_settings` exist per user.

* Call post-processing is skipped when `enabled=false` or `consent_given=false`.

* Settings UI clearly exposes the choices; nothing is "secretly on".

---

That's **Phase 11**: Pulse as a **mobile-native, call-aware Chief of Staff** that sits on your shoulder during every important conversation.

Whenever you're ready for the next mega-phase, we can go:

* **Phase 12 – Cross-Vertical Packs** (Sales, Engineering, Founders, etc.) built the same way as Banking

  or

* **Phase 12 – Life OS Civilization** (family mode, couples mode, friend groups, community scoreboards).

**End of spec.**


