# 🧠 PULSE AGI — PHASE 9

## Voice OS ("Talk to Pulse") + Infinite Job Verticals / Domain Packs

> **You are:** Senior Staff Engineer & AI Architect on Pulse OS (Next.js 16 + Supabase + TypeScript).

> **Goal:**

>
> 1. Give Pulse a **first-class voice layer** – "Talk to Pulse" everywhere (web + mobile-ready hooks).

> 2. Build a **Job/Vertical Mesh** that can represent *almost any job* as data (not hard-coded), and plug that into:

>
>    * Scoreboards

>    * Career Coach

>    * AGI agents and voice interactions

> 3. Make voice + verticals feel unified: "Talk to Pulse as a [my job] pro, about my real pipeline, right now."

This phase assumes Phases 1–8 are in place (AGI kernel, multi-agent mesh, digital twin, simulations, machine teaching, guardrails, modes, org/team AGI).

---

## 0. HIGH-LEVEL ARCHITECTURE

You are adding three large subsystems:

1. **Voice OS Core**

   * Voice sessions

   * Streams of speech → partial text → "assistant events"

   * Routing utterances into AGI, coaches, dashboard actions

2. **Job / Vertical Mesh**

   * Job ontology (jobs, skills, verticals)

   * Dynamic job descriptors (infinite jobs, like scoreboard)

   * User-job profiles with KPIs and scoreboards

3. **Voice + Vertical Integration**

   * "Talk to Pulse" UI surface

   * Intent router that understands:

     * "As my [job], what should I do next?"

     * "Update my scoreboard."

     * "Help me with this loan deal / code review / client escalation."

---

# 🅰️ SPRINT A — VOICE OS CORE ("TALK TO PULSE")

### A.1. DB: Voice Sessions & Turns

Create migration:

`supabase/migrations/20251225_voice_os_v1.sql`

```sql
-- ============================================
-- PULSE VOICE OS V1
-- Voice sessions & turns
-- ============================================

create table if not exists public.voice_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,

  -- 'ad_hoc' | 'journal' | 'coach' | 'agi_command_center' | 'call_overlay'
  context text not null default 'ad_hoc',

  -- Optional tagging like 'morning_checkin', 'deal_review', etc.
  tag text,

  started_at timestamptz not null default now(),
  ended_at timestamptz
);

create index if not exists voice_sessions_user_id_idx
  on public.voice_sessions(user_id);

create table if not exists public.voice_turns (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.voice_sessions(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,

  -- Sequential order inside session
  turn_index int not null,

  -- 'user' | 'assistant'
  speaker text not null,

  -- Raw text transcript of this turn (single utterance or assistant message)
  transcript text not null,

  -- Optional: ASR metadata, timing, partial hypotheses
  metadata jsonb not null default '{}'::jsonb,

  created_at timestamptz not null default now()
);

create index if not exists voice_turns_session_id_idx
  on public.voice_turns(session_id);
```

Later you can add `call_id`/`recording_url` for overlays, but not required now.

---

### A.2. Voice Session Service

Create:

`lib/voice/sessions.ts`

```ts
import { supabaseAdmin } from '@/lib/supabase';

export interface VoiceSession {
  id: string;
  user_id: string;
  context: string;
  tag?: string | null;
  started_at: string;
  ended_at?: string | null;
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

export async function startVoiceSession(
  userId: string,
  context: string,
  tag?: string,
): Promise<VoiceSession> {
  const dbUserId = await resolveUserId(userId);
  const { data, error } = await supabaseAdmin
    .from('voice_sessions')
    .insert({ user_id: dbUserId, context, tag })
    .select('*')
    .single();

  if (error || !data) {
    throw new Error('[Voice] Failed to start session');
  }

  return data as VoiceSession;
}

export async function endVoiceSession(sessionId: string): Promise<void> {
  const { error } = await supabaseAdmin
    .from('voice_sessions')
    .update({ ended_at: new Date().toISOString() })
    .eq('id', sessionId);
  if (error) console.error('[Voice] Failed to end session', error);
}

export async function appendVoiceTurn(params: {
  sessionId: string;
  userId: string;
  speaker: 'user' | 'assistant';
  transcript: string;
  metadata?: any;
}): Promise<void> {
  const dbUserId = await resolveUserId(params.userId);

  // Determine next turn_index
  const { data: existing } = await supabaseAdmin
    .from('voice_turns')
    .select('turn_index')
    .eq('session_id', params.sessionId)
    .order('turn_index', { ascending: false })
    .limit(1)
    .maybeSingle();

  const nextIndex =
    typeof existing?.turn_index === 'number' ? existing.turn_index + 1 : 0;

  const { error } = await supabaseAdmin.from('voice_turns').insert({
    session_id: params.sessionId,
    user_id: dbUserId,
    speaker: params.speaker,
    transcript: params.transcript,
    turn_index: nextIndex,
    metadata: params.metadata ?? {},
  });

  if (error) console.error('[Voice] Failed to append voice turn', error);
}
```

---

### A.3. Voice API: Start Session & Send Utterance

We'll keep voice vendor-agnostic. Frontend can use Web Speech / native / external SDKs and send text chunks here.

Create:

`app/api/voice/session/route.ts`

* `POST`: start a new voice session.

```ts
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { startVoiceSession } from '@/lib/voice/sessions';

export async function POST(req: NextRequest) {
  try {
    const { userId: clerkId } = await auth();
    if (!clerkId) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const context = body.context ?? 'ad_hoc';
    const tag = body.tag ?? null;

    const session = await startVoiceSession(clerkId, context, tag);
    return NextResponse.json(session);
  } catch (err: any) {
    console.error('[Voice] Session error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
```

Create:

`app/api/voice/utterance/route.ts`

* `POST`: accept a single user utterance (text) inside a session, route it, return assistant reply.

```ts
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { appendVoiceTurn } from '@/lib/voice/sessions';
import { routeVoiceUtterance } from '@/lib/voice/router';

export async function POST(req: NextRequest) {
  try {
    const { userId: clerkId } = await auth();
    if (!clerkId) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const body = await req.json();
    const { sessionId, text } = body;
    if (!sessionId || !text) {
      return new NextResponse('Bad Request', { status: 400 });
    }

    await appendVoiceTurn({
      sessionId,
      userId: clerkId,
      speaker: 'user',
      transcript: text,
    });

    const response = await routeVoiceUtterance({
      userId: clerkId,
      sessionId,
      text,
    });

    if (response.text) {
      await appendVoiceTurn({
        sessionId,
        userId: clerkId,
        speaker: 'assistant',
        transcript: response.text,
        metadata: { route: response.route },
      });
    }

    return NextResponse.json(response);
  } catch (err: any) {
    console.error('[Voice] Utterance error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
```

---

### A.4. Voice Router (Utterance → Intent → Handler)

Create:

`lib/voice/router.ts`

This is the "brainstem" for voice commands.

```ts
import { runAGIKernel } from '@/lib/agi/kernel';
import { getAGIUserProfile } from '@/lib/agi/settings';
import { detectVoiceIntent } from './intent_detector';
import { handleCoachVoiceTurn } from './routes/coach';
import { handleJournalVoiceTurn } from './routes/journal';
import { handleAgiCommandVoiceTurn } from './routes/agi_command';
import { handleGeneralChatVoiceTurn } from './routes/general_chat';

export interface VoiceRouteResult {
  route: string;      // 'coach', 'journal', 'agi_command', 'chat', etc.
  text: string;       // text to speak back to user
  metadata?: any;
}

export async function routeVoiceUtterance(params: {
  userId: string;
  sessionId: string;
  text: string;
}): Promise<VoiceRouteResult> {
  const profile = await getAGIUserProfile(params.userId);
  const intent = await detectVoiceIntent(params.text, profile);

  switch (intent.route) {
    case 'coach':
      return handleCoachVoiceTurn({ ...params, intent });
    case 'journal':
      return handleJournalVoiceTurn({ ...params, intent });
    case 'agi_command':
      return handleAgiCommandVoiceTurn({ ...params, intent });
    case 'chat':
    default:
      return handleGeneralChatVoiceTurn({ ...params, intent });
  }
}
```

Where:

* `detectVoiceIntent` uses lightweight heuristics + optional LLM call ("is this journaling, coach request, AGI command, or just chat?").

* `handleCoachVoiceTurn` will hook into your vertical/job system (Sprint B).

* `handleAgiCommandVoiceTurn` can map to AGI kernel actions (e.g., "run my AGI for today", "simulate next week", "what is my risk map?").

You can stub these for now and wire in Phase 9 pieces gradually.

---

### A.5. "Talk to Pulse" UI Component

Create:

`components/voice/TalkToPulseWidget.tsx`

* Minimal v1:

  * Microphone button (using browser's SpeechRecognition or a simple text box with "Press and talk" simulation).

  * Shows transcript of last user utterance and assistant reply.

  * Manages session:

    1. On first interaction: `POST /api/voice/session` → get `sessionId`.

    2. For each utterance (once recognized to text): `POST /api/voice/utterance` → get reply.

* Pluggable into:

  * Main dashboard

  * AGI Command Center

  * Coaches pages

You don't have to implement the full WebRTC/audio pipeline now — just assume frontend will turn audio into text and back.

---

✅ **Sprint A done when:**

* You can:

  * Hit `/api/voice/session` to start a session.

  * Hit `/api/voice/utterance` with `sessionId + text`.

  * See the cut-through: utterance → router → stub handler → reply, with `voice_turns` rows created.

* A simple UI widget allows you to "fake voice" via typed text while still using the pipeline for future real audio.

---

# 🅱️ SPRINT B — JOB / VERTICAL MESH (INFINITE JOBS)

Now we make Pulse understand **any job** as data.

### B.1. DB: Jobs, Skills, Verticals, User Jobs

Create migration:

`supabase/migrations/20251226_job_vertical_mesh_v1.sql`

```sql
-- ============================================
-- PULSE JOB / VERTICAL MESH V1
-- ============================================

create table if not exists public.job_verticals (
  id uuid primary key default gen_random_uuid(),
  key text unique not null,  -- e.g. 'banking', 'sales', 'engineering', 'healthcare'
  name text not null,
  description text,
  config jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.skills (
  id uuid primary key default gen_random_uuid(),
  key text unique not null,     -- e.g. 'credit_analysis', 'cold_outreach'
  name text not null,
  description text,
  created_at timestamptz not null default now()
);

create table if not exists public.jobs (
  id uuid primary key default gen_random_uuid(),
  vertical_id uuid references public.job_verticals(id),

  title text not null, -- "Commercial Loan Officer", "Frontend Engineer", etc.
  slug text,           -- optional, for indexing

  -- freeform descriptor for LLM + UI:
  -- { "summary": "...", "core_loops": [...], "kpis": [...], "risk_zones": [...], "seniority_levels": [...] }
  descriptor jsonb not null default '{}'::jsonb,

  created_by_user_id uuid references users(id),
  created_at timestamptz not null default now()
);

create index if not exists jobs_vertical_id_idx
  on public.jobs(vertical_id);

create table if not exists public.job_skills (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references public.jobs(id) on delete cascade,
  skill_id uuid not null references public.skills(id) on delete cascade,

  importance int not null default 5, -- 1-10
  created_at timestamptz not null default now()
);

create unique index if not exists job_skills_job_skill_unique
  on public.job_skills(job_id, skill_id);

create table if not exists public.user_jobs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  job_id uuid references public.jobs(id),

  -- For infinite arbitrary titles
  title_override text,  -- e.g. "VP, Biz Lending & Pulse Founder"

  -- Level: 'rookie' | 'operator' | 'pro' | 'elite' | 'legend'
  level text,

  -- Links to scoreboard / KPIs:
  scoreboard_config jsonb not null default '{}'::jsonb,

  created_at timestamptz not null default now()
);

create index if not exists user_jobs_user_id_idx
  on public.user_jobs(user_id);
```

This schema allows:

* A finite **set of verticals** (banking, sales, engineering, healthcare, etc.).

* Arbitrary **jobs** within each vertical (or cross-vertical).

* A **skills graph**.

* **User jobs** referencing jobs but allowing text override and scoreboard mapping.

---

### B.2. Job Descriptor Engine

Create:

`lib/jobs/descriptor.ts`

Responsibilities:

* When user says "My job is X", generate a **JobDescriptor**:

```ts
export interface JobDescriptor {
  summary: string;
  core_loops: string[];   // e.g. "Prospect → Qualify → Propose → Close"
  kpis: string[];         // e.g. "Deals Closed", "DSCR", "Response Time"
  risk_zones: string[];   // e.g. "Pipeline bottlenecks", "Reg compliance"
  seniority_levels: string[]; // ["Rookie","Operator","Pro","Elite","Legend"]
}

import { callAI } from '@/lib/ai/call';

export async function generateJobDescriptorFromTitle(
  title: string,
  verticalKey?: string,
): Promise<JobDescriptor> {
  const systemPrompt = `You are a job analysis expert. Given a job title and optional vertical, generate a structured job descriptor with summary, core loops, KPIs, risk zones, and seniority levels. Respond only with valid JSON.`;

  const userPrompt = `Job title: ${title}
${verticalKey ? `Vertical: ${verticalKey}` : ''}

Generate a job descriptor JSON with:
- summary: 2-3 sentence description of what this job entails
- core_loops: array of 3-5 key workflow loops (e.g. "Prospect → Qualify → Propose → Close")
- kpis: array of 5-8 key performance indicators
- risk_zones: array of 3-5 common risk areas or failure modes
- seniority_levels: array of progression levels (e.g. ["Rookie","Operator","Pro","Elite","Legend"])

Respond with JSON only.`;

  const result = await callAI({
    userId: 'system', // Use system user for job descriptor generation
    model: 'gpt-4o-mini',
    systemPrompt,
    userPrompt,
    temperature: 0.7,
    maxTokens: 1000,
    feature: 'job_descriptor_generation',
  });

  if (result.success && result.content) {
    try {
      const parsed = JSON.parse(result.content);
      return {
        summary: parsed.summary || `Professional in ${title}`,
        core_loops: parsed.core_loops || [],
        kpis: parsed.kpis || [],
        risk_zones: parsed.risk_zones || [],
        seniority_levels: parsed.seniority_levels || ['Rookie', 'Operator', 'Pro', 'Elite', 'Legend'],
      };
    } catch {
      // Fallback if JSON parse fails
    }
  }

  // Fallback descriptor
  return {
    summary: `Professional role: ${title}`,
    core_loops: ['Plan → Execute → Review'],
    kpis: ['Performance', 'Quality', 'Efficiency'],
    risk_zones: ['Overload', 'Quality issues'],
    seniority_levels: ['Rookie', 'Operator', 'Pro', 'Elite', 'Legend'],
  };
}
```

---

### B.3. Job Service: Create/Find Job

Create:

`lib/jobs/service.ts`

```ts
import { supabaseAdmin } from '@/lib/supabase';
import { generateJobDescriptorFromTitle } from './descriptor';

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

export async function findOrCreateJobForTitle(params: {
  userId: string;
  title: string;
  verticalKey?: string;
}): Promise<{ jobId: string }> {
  const dbUserId = await resolveUserId(params.userId);

  // 1. Try to find an existing job with same title (and vertical, if specified)
  const { data: existing } = await supabaseAdmin
    .from('jobs')
    .select('id')
    .eq('title', params.title)
    .limit(1)
    .maybeSingle();

  if (existing?.id) {
    return { jobId: existing.id };
  }

  // 2. Need to create
  let verticalId: string | null = null;
  if (params.verticalKey) {
    const { data: vertical } = await supabaseAdmin
      .from('job_verticals')
      .select('id')
      .eq('key', params.verticalKey)
      .maybeSingle();
    verticalId = vertical?.id ?? null;
  }

  const descriptor = await generateJobDescriptorFromTitle(
    params.title,
    params.verticalKey,
  );

  const { data: job, error: jobError } = await supabaseAdmin
    .from('jobs')
    .insert({
      vertical_id: verticalId,
      title: params.title,
      descriptor,
      created_by_user_id: dbUserId,
    })
    .select('id')
    .single();

  if (jobError || !job) {
    throw new Error('[Jobs] Failed to create job');
  }

  return { jobId: job.id as string };
}
```

---

### B.4. User Job Profile

Create helper in `lib/jobs/user_job.ts`:

```ts
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

export async function attachUserToJob(params: {
  userId: string;
  jobId: string;
  titleOverride?: string;
}): Promise<void> {
  const dbUserId = await resolveUserId(params.userId);

  const { error } = await supabaseAdmin.from('user_jobs').insert({
    user_id: dbUserId,
    job_id: params.jobId,
    title_override: params.titleOverride ?? null,
  });

  if (error) console.error('[Jobs] Failed to attach user to job', error);
}

export async function getUserJobsWithDescriptors(userId: string): Promise<any[]> {
  const dbUserId = await resolveUserId(userId);

  const { data, error } = await supabaseAdmin
    .from('user_jobs')
    .select(`
      *,
      jobs (
        id,
        title,
        descriptor,
        job_verticals (
          key,
          name,
          config
        )
      )
    `)
    .eq('user_id', dbUserId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('[Jobs] Failed to fetch user jobs', error);
    return [];
  }

  return (data || []).map((uj: any) => ({
    id: uj.id,
    job_id: uj.job_id,
    title: uj.title_override || uj.jobs?.title || 'Unknown',
    level: uj.level,
    descriptor: uj.jobs?.descriptor || {},
    vertical: uj.jobs?.job_verticals || null,
    scoreboard_config: uj.scoreboard_config,
  }));
}
```

And route:

`app/api/jobs/my/route.ts`:

* `GET`: current user jobs.

* `POST`: set/update current job.

Body: `{ title, verticalKey? }`:

1. Call `findOrCreateJobForTitle`.

2. Call `attachUserToJob`.

This is the **"infinite jobs" entrypoint**: any title the user gives will become a structured Job descriptor.

---

### B.5. Connect Jobs ↔ Scoreboards / Career Engine

You already have:

* Scoreboard system & KPIs

* Career Ascension / levels (Rookie → Legend)

Extend `user_jobs.scoreboard_config`:

* Use JSON like:

```json
{
  "primary_scoreboard_id": "uuid-of-scoreboard",
  "metric_mappings": {
    "Deals Closed": "scoreboard_metric_key",
    "DSCR": "another_metric_key"
  }
}
```

Add a helper:

`lib/jobs/scoreboard_integration.ts`:

* When a new job is created, propose scoreboard mappings based on descriptor.kpis.

* This can be LLM-powered or rule-based.

Later, AGI agents can pull from `user_jobs` and scoreboard to reason about job performance, but for Phase 9 you mainly need the data wiring.

---

✅ **Sprint B done when:**

* You can:

  * Call `POST /api/jobs/my` with a random job title like "Drone Racing Analyst".

  * Migration creates or finds a `jobs` row with a descriptor.

  * A `user_jobs` row links user ↔ job.

* Career/scoreboard modules can see `user_jobs` and the job's descriptor/KPIs.

---

# 🅲 SPRINT C — VOICE + VERTICAL INTEGRATION

Now we blend:

* Voice OS

* Job/Vertical mesh

* Career/Credit/Domain coaches

* AGI kernel

into **"Talk to Pulse as my job."**

---

### C.1. Voice Intent Detection (Job-Aware)

Update `lib/voice/intent_detector.ts` (create if missing):

* Input: `(text: string, profile: AGIUserProfile & { jobTitles?: string[] })`

* Output:

```ts
export interface VoiceIntent {
  route: 'coach' | 'journal' | 'agi_command' | 'chat';
  coachDomain?: 'job' | 'sales' | 'finance' | 'relationships' | 'health';
  jobTitleHint?: string;
  agiCommandKey?: string; // 'run_today', 'run_simulation', etc.
}

export async function detectVoiceIntent(
  text: string,
  profile: any,
): Promise<VoiceIntent> {
  const lowerText = text.toLowerCase();

  // AGI command patterns
  if (
    lowerText.includes('run agi') ||
    lowerText.includes('run my agi') ||
    lowerText.includes('execute agi')
  ) {
    return {
      route: 'agi_command',
      agiCommandKey: 'run_today',
    };
  }

  if (
    lowerText.includes('simulate') ||
    lowerText.includes('simulation') ||
    lowerText.includes('what if')
  ) {
    return {
      route: 'agi_command',
      agiCommandKey: 'simulate_30_days',
    };
  }

  if (
    lowerText.includes('risk') ||
    lowerText.includes('risks') ||
    lowerText.includes('what are my risks')
  ) {
    return {
      route: 'agi_command',
      agiCommandKey: 'summarize_risks',
    };
  }

  // Journal patterns
  if (
    lowerText.includes('log') ||
    lowerText.includes('journal') ||
    lowerText.includes('note') ||
    lowerText.includes('remember')
  ) {
    return {
      route: 'journal',
    };
  }

  // Coach patterns (job-aware)
  if (
    lowerText.includes('as a') ||
    lowerText.includes('as my') ||
    lowerText.includes('what should i') ||
    lowerText.includes('help me with') ||
    lowerText.includes('advice') ||
    lowerText.includes('coach')
  ) {
    // Try to extract job title hint
    const jobMatch = lowerText.match(/as (?:a|my) ([^,]+?)(?:,|$)/);
    const jobTitleHint = jobMatch ? jobMatch[1].trim() : undefined;

    return {
      route: 'coach',
      coachDomain: 'job',
      jobTitleHint,
    };
  }

  // Default to chat
  return {
    route: 'chat',
  };
}
```

---

### C.2. Job Coach Voice Route

Create:

`lib/voice/routes/coach.ts`

Hook into your Career/Job Coach engine + job descriptors.

```ts
import { VoiceRouteResult } from '../router';
import { VoiceIntent } from '../intent_detector';
import { getUserJobsWithDescriptors } from '@/lib/jobs/user_job';
import { callAI } from '@/lib/ai/call';

export async function handleCoachVoiceTurn(params: {
  userId: string;
  sessionId: string;
  text: string;
  intent: VoiceIntent;
}): Promise<VoiceRouteResult> {
  // 1. Load user jobs
  const userJobs = await getUserJobsWithDescriptors(params.userId);

  // 2. Pick the primary job (or let LLM choose best match)
  const primary = userJobs[0]; // refine with intent.jobTitleHint if present

  if (!primary || !primary.descriptor) {
    return {
      route: 'coach',
      text: "I don't have information about your job yet. Please set your job title in settings first.",
    };
  }

  // 3. Build context for job coach
  const jobContext = {
    title: primary.title,
    descriptor: primary.descriptor,
    level: primary.level,
    vertical: primary.vertical,
  };

  const systemPrompt = `You are Pulse, a job-specific AI coach. The user is a ${jobContext.title} at ${jobContext.level || 'operator'} level. 

Job Summary: ${jobContext.descriptor.summary || 'Not specified'}
Core Loops: ${(jobContext.descriptor.core_loops || []).join(', ')}
Key KPIs: ${(jobContext.descriptor.kpis || []).join(', ')}
Risk Zones: ${(jobContext.descriptor.risk_zones || []).join(', ')}

Provide concise, actionable coaching advice specific to this job. Be conversational and helpful.`;

  const result = await callAI({
    userId: params.userId,
    model: 'gpt-4o-mini',
    systemPrompt,
    userPrompt: params.text,
    temperature: 0.7,
    maxTokens: 500,
    feature: 'voice_job_coach',
  });

  if (result.success && result.content) {
    return {
      route: 'coach',
      text: result.content,
      metadata: {
        jobId: primary.job_id,
        jobTitle: primary.title,
      },
    };
  }

  return {
    route: 'coach',
    text: "I'm having trouble processing that right now. Try asking me about your job or what you should focus on today.",
  };
}
```

---

### C.3. AGI Command Voice Route

Create:

`lib/voice/routes/agi_command.ts`

Support voice commands like:

* "Run AGI for today."

* "Simulate my next 30 days under AGI plan."

* "What are my biggest risks this week?"

Implementation sketch:

```ts
import { runAGIKernel } from '@/lib/agi/kernel';
import { runScenariosForUser } from '@/lib/agi/simulation/orchestrator';
import { loadTwinState } from '@/lib/agi/digital_twin/store';
import { getUserEntitlements } from '@/lib/agi/entitlements';
import { VoiceRouteResult } from '../router';
import { VoiceIntent } from '../intent_detector';

export async function handleAgiCommandVoiceTurn(params: {
  userId: string;
  sessionId: string;
  text: string;
  intent: VoiceIntent;
}): Promise<VoiceRouteResult> {
  switch (params.intent.agiCommandKey) {
    case 'run_today': {
      try {
        const run = await runAGIKernel(params.userId, {
          type: 'manual',
          source: 'voice:agi_command:run_today',
        });

        return {
          route: 'agi_command',
          text: `I ran your AGI for today and proposed ${run.finalPlan.length} action${run.finalPlan.length !== 1 ? 's' : ''}. Check your Command Center to review and approve them.`,
          metadata: { runId: run.runId },
        };
      } catch (err: any) {
        return {
          route: 'agi_command',
          text: `I had trouble running your AGI: ${err.message}. Please try again or check your settings.`,
        };
      }
    }

    case 'simulate_30_days': {
      const entitlements = await getUserEntitlements(params.userId);
      if (!entitlements.can_use_simulation) {
        return {
          route: 'agi_command',
          text: `Simulations aren't available on your current plan. Upgrade to enable this feature.`,
        };
      }

      const twin = await loadTwinState(params.userId);
      if (!twin) {
        return {
          route: 'agi_command',
          text: `I don't have enough data yet to simulate 30 days. Let's get a week of activity first.`,
        };
      }

      try {
        await runScenariosForUser(params.userId, twin, 30);
        return {
          route: 'agi_command',
          text: `I ran 30-day simulations for your current path and the AGI plan. Open your Simulation tab to see how they compare.`,
        };
      } catch (err: any) {
        return {
          route: 'agi_command',
          text: `I had trouble running the simulation: ${err.message}. Please try again later.`,
        };
      }
    }

    case 'summarize_risks': {
      // Load latest risk/opportunity map and summarize
      try {
        const { supabaseAdmin } = await import('@/lib/supabase');
        const { data: latestMap } = await supabaseAdmin
          .from('agi_risk_opportunity_maps')
          .select('risks, opportunities')
          .eq('user_id', params.userId)
          .order('generated_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (!latestMap || !latestMap.risks || (latestMap.risks as any[]).length === 0) {
          return {
            route: 'agi_command',
            text: `I don't see any major risks right now. Your trajectory looks stable.`,
          };
        }

        const risks = latestMap.risks as any[];
        const topRisks = risks.slice(0, 3);
        const riskText = topRisks.map((r, i) => `${i + 1}. ${r.label}: ${r.description}`).join(' ');

        return {
          route: 'agi_command',
          text: `Here are your top risks: ${riskText}`,
        };
      } catch (err: any) {
        return {
          route: 'agi_command',
          text: `I had trouble loading your risk map. Please check your Command Center.`,
        };
      }
    }

    default:
      return {
        route: 'agi_command',
        text: `I heard an AGI-related request, but I'm not sure which command to run. Try saying "Run AGI for today" or "Simulate the next 30 days."`,
      };
  }
}
```

---

### C.4. Journal Voice Route

Use your existing journal/habits/memory system:

`lib/voice/routes/journal.ts`

```ts
import { VoiceRouteResult } from '../router';
import { supabaseAdmin } from '@/lib/supabase';

export async function handleJournalVoiceTurn(params: {
  userId: string;
  sessionId: string;
  text: string;
  intent: any;
}): Promise<VoiceRouteResult> {
  // Store in journal/notes system if available
  // For now, just acknowledge
  return {
    route: 'journal',
    text: "I've logged that for you. Want me to summarize your recent journal entries?",
  };
}
```

---

### C.5. General Chat Route

For leftover queries:

`lib/voice/routes/general_chat.ts`

```ts
import { VoiceRouteResult } from '../router';
import { callAI } from '@/lib/ai/call';

export async function handleGeneralChatVoiceTurn(params: {
  userId: string;
  sessionId: string;
  text: string;
  intent: any;
}): Promise<VoiceRouteResult> {
  const result = await callAI({
    userId: params.userId,
    model: 'gpt-4o-mini',
    systemPrompt: 'You are Pulse, a helpful AI assistant. Be conversational and concise.',
    userPrompt: params.text,
    temperature: 0.7,
    maxTokens: 300,
    feature: 'voice_chat',
  });

  return {
    route: 'chat',
    text: result.success && result.content ? result.content : "I'm here to help. What would you like to know?",
  };
}
```

---

### C.6. Job-Aware Prompts for Vertical Packs

You want **domain-specific verticals** like:

* Banking / Commercial Lending

* Sales / BizDev

* Engineering / Product

* Healthcare, etc.

Model this as **vertical packs** attached to `job_verticals`:

* Extend `job_verticals` with `config`:

```sql
alter table public.job_verticals
  add column if not exists config jsonb not null default '{}'::jsonb;
```

Where `config` includes:

* `default_scoreboard_templates`

* `default_agent_weights` (e.g. pipeline vs relationships)

* `vertical_prompts` (e.g. domain-specific context like "DSCR, SBA, LTV" for banking).

Your `callJobCoachLLM` can:

* Pull `job.vertical.config.vertical_prompts`

* Prepend vertical hints to the LLM system prompt.

This is how you get **domain-specific behavior** without hard-coding each job in code.

---

### C.7. Voice Entry Points Across Pulse

Place the `TalkToPulseWidget` in:

1. **Main dashboard** – default context: `ad_hoc`.

2. **Career/Career Coach page** – default context/tag: `coach_job`.

3. **AGI Command Center** – default context/tag: `agi_command_center`.

Pass context/tag to `/api/voice/session` so you can later analyze:

* Voice used for job support vs AGI vs journaling.

---

✅ **Sprint C done when:**

* From the UI, you can:

  * Start a voice session (even if "voice" is typed text for now).

  * Say: "I'm a [job title]. What should I focus on today?" → Coach route, job-aware reply.

  * Say: "Run my AGI for today" → AGI kernel executes, voice confirms.

* Voice sessions & turns are written into DB and queryable.

* Job descriptors are created and used by the job coach LLM.

---

# PHASE 9 — SUCCESS CRITERIA (END-TO-END)

Phase 9 is considered **complete** when:

### ✅ Voice OS

* `voice_sessions` + `voice_turns` are live and populated.

* `/api/voice/session` & `/api/voice/utterance` create sessions and threaded conversations.

* A reusable `TalkToPulseWidget` exists and works in at least one authenticated page.

### ✅ Job / Vertical Mesh

* `job_verticals`, `jobs`, `skills`, `job_skills`, `user_jobs` are live.

* `POST /api/jobs/my` with arbitrary titles creates/links jobs and descriptors.

* Career/Scoreboard engines can see `user_jobs` and use job descriptors.

### ✅ Voice + Vertical Integration

* Voice intent router routes to:

  * Job coach when the user asks job-related questions.

  * AGI commands for "run AGI," "simulate," "show risks."

  * Journal and general chat as needed.

* Job coach calls use:

  * Job descriptors

  * Vertical config

  * (Optionally) scoreboard snapshots

* Voice flows feel like:

  > "I talk to Pulse in my own words as a [my job], and it knows what I actually do."

### ✅ Infinite Jobs Constraint

* You never hard-code job types in the core logic.

* Job titles → descriptors → KPIs → coach prompts are **data-driven**, so any future job is just another row, not a new codepath.

---

This gives Claude a **huge, clear next mission**:

> Turn Pulse into a voice-native, job-aware AGI that can talk to *any* professional about *their* world.

**End of spec.**


