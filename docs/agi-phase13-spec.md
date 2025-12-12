# 🧠 PULSE OS — PHASE 13

## Onboarding, Teaching, & Launch Hardening

> **You are:** Senior Staff Engineer on Pulse OS (Next.js 16 + Supabase + TypeScript).

> **Goal:**

> Turn the raw AGI stack (Phases 1–12) into something **a new user can adopt in one sitting**, with:

>
> * Guided onboarding (job(s), household, AGI level, data access)

> * "Ask Pulse about Pulse" teaching system

> * Built-in demos / scenarios so Pulse can *show off*

> * AGI telemetry + guardrails dashboards so we can safely run a public beta

---

## 0. Context Assumptions

Assume all of this already exists:

* AGI Kernel, agents, planner, executor

* Job / Vertical mesh (`jobs`, `job_verticals`, `user_jobs`)

* Household / org / team models (`organizations`, `households`, etc.)

* Voice OS + Talk to Pulse widget

* Call Intelligence + mobile shell (even if early)

You are **not** adding more "brain modules" here; you are:

* Wiring **entry points**

* Building **explainability & teaching**

* Adding **metrics + guardrails**

* Creating a **beta-ready experience**

---

# SECTION 1 — FIRST-RUN ONBOARDING WIZARD

We need a **single funnel** that sets up:

* Job(s) → Vertical pack(s)

* Household → Members (optional)

* AGI level → off / assist / autopilot

* Key data sources → calendar, email, calls, banking modules

## 1.1. DB: Store Onboarding State

Migration: `supabase/migrations/20251230_onboarding_state_v1.sql`

```sql
-- ============================================
-- PULSE ONBOARDING STATE V1
-- Track user onboarding progress
-- ============================================

create table if not exists public.onboarding_state (
  user_id uuid primary key references users(id) on delete cascade,
  step text not null default 'start',  -- 'start', 'jobs', 'household', 'agi_level', 'data', 'complete'
  data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists onboarding_state_user_id_idx
  on public.onboarding_state(user_id);
```

---

## 1.2. Onboarding Service

Create: `lib/onboarding/service.ts`

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

export interface OnboardingState {
  user_id: string;
  step: 'start' | 'jobs' | 'household' | 'agi_level' | 'data' | 'complete';
  data: {
    jobs?: string[];
    householdChoice?: 'solo' | 'couple' | 'family';
    householdId?: string;
    agiLevel?: 'off' | 'assist' | 'autopilot';
    dataSources?: {
      calendar?: boolean;
      email?: boolean;
      calls?: boolean;
    };
  };
}

export async function getOnboardingState(userId: string): Promise<OnboardingState | null> {
  const dbUserId = await resolveUserId(userId);

  const { data, error } = await supabaseAdmin
    .from('onboarding_state')
    .select('*')
    .eq('user_id', dbUserId)
    .maybeSingle();

  if (error) {
    console.error('[Onboarding] Failed to load state', error);
    return null;
  }

  if (!data) {
    // Create initial state
    const { data: created } = await supabaseAdmin
      .from('onboarding_state')
      .insert({
        user_id: dbUserId,
        step: 'start',
        data: {},
      })
      .select('*')
      .single();

    return created as OnboardingState;
  }

  return data as OnboardingState;
}

export async function updateOnboardingState(
  userId: string,
  step: OnboardingState['step'],
  dataPatch: Partial<OnboardingState['data']>,
): Promise<void> {
  const dbUserId = await resolveUserId(userId);

  const { data: existing } = await supabaseAdmin
    .from('onboarding_state')
    .select('data')
    .eq('user_id', dbUserId)
    .maybeSingle();

  const currentData = (existing?.data as OnboardingState['data']) || {};

  const { error } = await supabaseAdmin
    .from('onboarding_state')
    .upsert({
      user_id: dbUserId,
      step,
      data: { ...currentData, ...dataPatch },
      updated_at: new Date().toISOString(),
    }, {
      onConflict: 'user_id',
    });

  if (error) {
    console.error('[Onboarding] Failed to update state', error);
    throw new Error('Failed to update onboarding state');
  }
}

export async function isOnboardingComplete(userId: string): Promise<boolean> {
  const state = await getOnboardingState(userId);
  return state?.step === 'complete' || false;
}
```

---

## 1.3. Onboarding API

Create: `app/api/onboarding/state/route.ts`

```ts
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import {
  getOnboardingState,
  updateOnboardingState,
  isOnboardingComplete,
} from '@/lib/onboarding/service';

export async function GET(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const state = await getOnboardingState(userId);
    const complete = await isOnboardingComplete(userId);

    return NextResponse.json({ state, complete });
  } catch (err: any) {
    console.error('[API][Onboarding] GET error:', err);
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
    const { step, data } = body;

    if (!step) {
      return NextResponse.json({ error: 'step is required' }, { status: 400 });
    }

    await updateOnboardingState(userId, step, data || {});

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    console.error('[API][Onboarding] POST error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
```

---

## 1.4. Onboarding UI

Create page: `app/(authenticated)/onboarding/page.tsx`

```tsx
'use client';

import { useState, useEffect } from 'react';
import { useUser } from '@clerk/nextjs';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { AppCard } from '@/components/ui/AppCard';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';

type OnboardingStep = 'welcome' | 'jobs' | 'household' | 'agi_level' | 'data' | 'finish';

export default function OnboardingPage() {
  const { user } = useUser();
  const router = useRouter();
  const [step, setStep] = useState<OnboardingStep>('welcome');
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState({
    primaryJob: '',
    secondaryJobs: [] as string[],
    householdChoice: 'solo' as 'solo' | 'couple' | 'family',
    agiLevel: 'assist' as 'off' | 'assist' | 'autopilot',
    dataSources: {
      calendar: false,
      email: false,
      calls: false,
    },
  });

  useEffect(() => {
    checkOnboardingStatus();
  }, []);

  async function checkOnboardingStatus() {
    try {
      const res = await fetch('/api/onboarding/state');
      if (res.ok) {
        const { state, complete } = await res.json();
        if (complete) {
          router.push('/');
          return;
        }
        if (state?.step) {
          // Resume from saved step
          setStep(state.step as OnboardingStep);
          setData({ ...data, ...state.data });
        }
      }
    } catch (err) {
      console.error('Failed to check onboarding status', err);
    }
  }

  async function saveStep(stepName: OnboardingStep, stepData?: any) {
    setLoading(true);
    try {
      await fetch('/api/onboarding/state', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          step: stepName,
          data: stepData || data,
        }),
      });
    } catch (err) {
      console.error('Failed to save step', err);
    } finally {
      setLoading(false);
    }
  }

  async function handleJobsSubmit() {
    if (!data.primaryJob.trim()) return;

    setLoading(true);
    try {
      // Install vertical pack for primary job
      await fetch('/api/verticals/install', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jobTitle: data.primaryJob }),
      });

      // Install secondary jobs if any
      for (const job of data.secondaryJobs) {
        if (job.trim()) {
          await fetch('/api/verticals/install', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ jobTitle: job }),
          });
        }
      }

      await saveStep('household', data);
      setStep('household');
    } catch (err) {
      console.error('Failed to install jobs', err);
    } finally {
      setLoading(false);
    }
  }

  async function handleHouseholdSubmit() {
    setLoading(true);
    try {
      if (data.householdChoice !== 'solo') {
        const householdName = data.householdChoice === 'couple' ? 'Couple' : 'Family';
        const res = await fetch('/api/household/create', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: householdName }),
        });

        if (res.ok) {
          const { householdId } = await res.json();
          setData({ ...data, householdId });
        }
      }

      await saveStep('agi_level', data);
      setStep('agi_level');
    } catch (err) {
      console.error('Failed to create household', err);
    } finally {
      setLoading(false);
    }
  }

  async function handleAGILevelSubmit() {
    setLoading(true);
    try {
      // Save AGI settings
      await fetch('/api/agi/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          level: data.agiLevel,
          max_runs_per_day: 12,
          require_confirmation_for_high_impact: true,
        }),
      });

      await saveStep('data', data);
      setStep('data');
    } catch (err) {
      console.error('Failed to save AGI settings', err);
    } finally {
      setLoading(false);
    }
  }

  async function handleDataSourcesSubmit() {
    setLoading(true);
    try {
      await saveStep('finish', data);
      setStep('finish');
    } catch (err) {
      console.error('Failed to save data sources', err);
    } finally {
      setLoading(false);
    }
  }

  async function handleComplete() {
    setLoading(true);
    try {
      await saveStep('complete', data);
      router.push('/');
    } catch (err) {
      console.error('Failed to complete onboarding', err);
    } finally {
      setLoading(false);
    }
  }

  async function handleRunFirstAGI() {
    setLoading(true);
    try {
      await fetch('/api/agi/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'manual',
          source: 'onboarding:first_run',
        }),
      });
      router.push('/agi/command-center');
    } catch (err) {
      console.error('Failed to run AGI', err);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="container mx-auto p-6 max-w-2xl">
      <div className="space-y-6">
        {step === 'welcome' && (
          <AppCard className="p-6">
            <h1 className="text-2xl font-bold text-white mb-4">Welcome to Pulse</h1>
            <p className="text-white/80 mb-6">
              Pulse is your AI-powered Life OS. We'll help you set up your job intelligence,
              household coordination, and AGI assistant in just a few steps.
            </p>
            <Button onClick={() => setStep('jobs')} className="w-full">
              Get Started
            </Button>
          </AppCard>
        )}

        {step === 'jobs' && (
          <AppCard className="p-6">
            <h2 className="text-xl font-semibold text-white mb-4">Your Work</h2>
            <div className="space-y-4">
              <div>
                <Label className="text-white">Primary Job Title</Label>
                <Input
                  value={data.primaryJob}
                  onChange={(e) => setData({ ...data, primaryJob: e.target.value })}
                  placeholder="e.g., Commercial Loan Officer"
                  className="mt-2"
                />
              </div>
              <div>
                <Label className="text-white">Secondary Jobs (optional)</Label>
                <Input
                  placeholder="e.g., Real Estate Investor"
                  className="mt-2"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && e.currentTarget.value.trim()) {
                      setData({
                        ...data,
                        secondaryJobs: [...data.secondaryJobs, e.currentTarget.value],
                      });
                      e.currentTarget.value = '';
                    }
                  }}
                />
                {data.secondaryJobs.length > 0 && (
                  <div className="mt-2 space-y-1">
                    {data.secondaryJobs.map((job, i) => (
                      <div key={i} className="text-white/60 text-sm">
                        {job}
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <Button onClick={handleJobsSubmit} disabled={loading || !data.primaryJob.trim()}>
                Continue
              </Button>
            </div>
          </AppCard>
        )}

        {step === 'household' && (
          <AppCard className="p-6">
            <h2 className="text-xl font-semibold text-white mb-4">Your Life Situation</h2>
            <RadioGroup
              value={data.householdChoice}
              onValueChange={(v) => setData({ ...data, householdChoice: v as any })}
            >
              <div className="flex items-center space-x-2 mb-4">
                <RadioGroupItem value="solo" id="solo" />
                <Label htmlFor="solo" className="text-white">Solo - Just me</Label>
              </div>
              <div className="flex items-center space-x-2 mb-4">
                <RadioGroupItem value="couple" id="couple" />
                <Label htmlFor="couple" className="text-white">Couple - Me and my partner</Label>
              </div>
              <div className="flex items-center space-x-2 mb-4">
                <RadioGroupItem value="family" id="family" />
                <Label htmlFor="family" className="text-white">Family / Household</Label>
              </div>
            </RadioGroup>
            <Button onClick={handleHouseholdSubmit} disabled={loading}>
              Continue
            </Button>
          </AppCard>
        )}

        {step === 'agi_level' && (
          <AppCard className="p-6">
            <h2 className="text-xl font-semibold text-white mb-4">AGI Assistant Level</h2>
            <RadioGroup
              value={data.agiLevel}
              onValueChange={(v) => setData({ ...data, agiLevel: v as any })}
            >
              <div className="mb-4">
                <div className="flex items-center space-x-2 mb-2">
                  <RadioGroupItem value="off" id="off" />
                  <Label htmlFor="off" className="text-white font-medium">Off</Label>
                </div>
                <p className="text-white/60 text-sm ml-6">No automatic actions</p>
              </div>
              <div className="mb-4">
                <div className="flex items-center space-x-2 mb-2">
                  <RadioGroupItem value="assist" id="assist" />
                  <Label htmlFor="assist" className="text-white font-medium">Assist (Recommended)</Label>
                </div>
                <p className="text-white/60 text-sm ml-6">
                  Pulse suggests actions; you approve them
                </p>
              </div>
              <div className="mb-4">
                <div className="flex items-center space-x-2 mb-2">
                  <RadioGroupItem value="autopilot" id="autopilot" />
                  <Label htmlFor="autopilot" className="text-white font-medium">Autopilot</Label>
                </div>
                <p className="text-white/60 text-sm ml-6">
                  Pulse automatically executes low-risk actions
                </p>
              </div>
            </RadioGroup>
            <Button onClick={handleAGILevelSubmit} disabled={loading}>
              Continue
            </Button>
          </AppCard>
        )}

        {step === 'data' && (
          <AppCard className="p-6">
            <h2 className="text-xl font-semibold text-white mb-4">Data Sources (Optional)</h2>
            <p className="text-white/60 mb-4">
              Connect your data sources to make Pulse more intelligent. You can skip this and add them later.
            </p>
            <div className="space-y-4">
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={data.dataSources.calendar}
                  onChange={(e) =>
                    setData({
                      ...data,
                      dataSources: { ...data.dataSources, calendar: e.target.checked },
                    })
                  }
                />
                <Label className="text-white">Calendar</Label>
              </div>
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={data.dataSources.email}
                  onChange={(e) =>
                    setData({
                      ...data,
                      dataSources: { ...data.dataSources, email: e.target.checked },
                    })
                  }
                />
                <Label className="text-white">Email</Label>
              </div>
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={data.dataSources.calls}
                  onChange={(e) =>
                    setData({
                      ...data,
                      dataSources: { ...data.dataSources, calls: e.target.checked },
                    })
                  }
                />
                <Label className="text-white">Call Intelligence</Label>
              </div>
            </div>
            <Button onClick={handleDataSourcesSubmit} disabled={loading} className="mt-4">
              Continue
            </Button>
          </AppCard>
        )}

        {step === 'finish' && (
          <AppCard className="p-6">
            <h2 className="text-xl font-semibold text-white mb-4">You're All Set!</h2>
            <div className="space-y-4 mb-6">
              <div>
                <h3 className="text-white font-medium">Job Intelligence</h3>
                <p className="text-white/60 text-sm">{data.primaryJob}</p>
              </div>
              <div>
                <h3 className="text-white font-medium">Household</h3>
                <p className="text-white/60 text-sm">
                  {data.householdChoice === 'solo' ? 'Solo' : data.householdChoice}
                </p>
              </div>
              <div>
                <h3 className="text-white font-medium">AGI Level</h3>
                <p className="text-white/60 text-sm">{data.agiLevel}</p>
              </div>
            </div>
            <div className="space-y-2">
              <Button onClick={handleRunFirstAGI} disabled={loading} className="w-full">
                Run Your First AGI Sweep
              </Button>
              <Button
                onClick={handleComplete}
                disabled={loading}
                variant="outline"
                className="w-full"
              >
                Go to Dashboard
              </Button>
            </div>
          </AppCard>
        )}
      </div>
    </div>
  );
}
```

Also add redirect logic in root layout or middleware:

```ts
// In app/(authenticated)/layout.tsx or middleware
import { isOnboardingComplete } from '@/lib/onboarding/service';

// Check on page load and redirect if needed
```

---

# SECTION 2 — "ASK PULSE ABOUT PULSE" TEACHING SYSTEM

We want Pulse to **teach itself**: explain modules, features, dashboards, and "what it just did".

## 2.1. Teaching Knowledge Base

Migration: `supabase/migrations/20251230_pulse_teaching_kb_v1.sql`

```sql
-- ============================================
-- PULSE TEACHING KNOWLEDGE BASE V1
-- Documentation and teaching content
-- ============================================

create table if not exists public.pulse_docs (
  id uuid primary key default gen_random_uuid(),
  category text not null,           -- 'agi', 'jobs', 'household', 'banking_pack', etc.
  slug text not null,               -- 'what-is-agi-kernel', etc.
  title text not null,
  content_md text not null,         -- markdown content
  tags text[] default array[]::text[],
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists pulse_docs_slug_unique
  on public.pulse_docs(slug);

create index if not exists pulse_docs_category_idx
  on public.pulse_docs(category);
```

Seed with core docs (via SQL script or migration):

```sql
insert into public.pulse_docs (category, slug, title, content_md, tags) values
('agi', 'what-is-agi-kernel', 'What is the AGI Kernel?', 
'The AGI Kernel is the core reasoning engine of Pulse. It runs multiple specialized agents that analyze your life data and propose actions to help you achieve your goals.', 
array['agi', 'core', 'basics']),
('agi', 'what-are-agents', 'What are Agents?',
'Agents are specialized AI modules that focus on specific domains like work, relationships, finances, or emotions. Each agent analyzes relevant data and proposes actions.',
array['agi', 'agents', 'basics']),
('jobs', 'what-are-vertical-packs', 'What are Vertical Packs?',
'Vertical Packs are job-specific intelligence modules. When you tell Pulse your job title, it generates a custom pack with KPIs, workflows, and domain knowledge for that role.',
array['jobs', 'vertical', 'basics']),
('household', 'what-is-household-mode', 'What is Household Mode?',
'Household Mode allows Pulse to coordinate across multiple people in a shared living environment. It detects calendar conflicts, shared tasks, and household stress signals.',
array['household', 'family', 'coordination']),
('calls', 'what-is-call-intelligence', 'What is Call Intelligence?',
'Call Intelligence transcribes your calls, extracts key decisions and follow-ups, and creates tasks automatically. It requires your explicit consent and respects privacy laws.',
array['calls', 'intelligence', 'privacy']);
```

---

## 2.2. Teaching Engine

Create: `lib/teaching/engine.ts`

```ts
import { supabaseAdmin } from '@/lib/supabase';
import { callAI } from '@/lib/ai/call';
import { getUserVerticalPacks } from '@/lib/verticals/generator';
import { getHouseholdsForUser } from '@/lib/household/model';

export interface TeachingAnswer {
  answer: string;
  sources: { title: string; slug: string }[];
}

export async function answerPulseQuestion(
  userId: string,
  question: string,
  context?: { runId?: string; page?: string },
): Promise<TeachingAnswer> {
  // Search pulse_docs by keyword
  const searchTerms = question.toLowerCase().split(/\s+/);
  const { data: docs } = await supabaseAdmin
    .from('pulse_docs')
    .select('*')
    .or(
      searchTerms
        .map((term) => `title.ilike.%${term}%,content_md.ilike.%${term}%`)
        .join(','),
    )
    .limit(5);

  // Load user context
  const verticalPacks = await getUserVerticalPacks(userId);
  const households = await getHouseholdsForUser(userId);

  const userContext = {
    hasVerticalPacks: verticalPacks.length > 0,
    verticalPackTitles: verticalPacks.map((p) => p.jobTitle),
    hasHousehold: households.length > 0,
  };

  // Build context for LLM
  const docContext = (docs || [])
    .map((d) => `## ${d.title}\n${d.content_md}`)
    .join('\n\n');

  const systemPrompt = `You are Pulse's teaching assistant. Answer questions about Pulse features and capabilities based on the provided documentation. Be concise, helpful, and tailor your answer to the user's setup when relevant.`;

  const userPrompt = `User Question: ${question}

Documentation:
${docContext}

User Context:
- Has vertical packs: ${userContext.hasVerticalPacks}
${userContext.hasVerticalPacks ? `- Job titles: ${userContext.verticalPackTitles.join(', ')}` : ''}
- Has household: ${userContext.hasHousehold}

${context?.runId ? `\nContext: User is asking about AGI run ${context.runId}` : ''}
${context?.page ? `\nContext: User is on page: ${context.page}` : ''}

Provide a clear, helpful answer. Reference specific documentation when relevant.`;

  const result = await callAI({
    userId,
    model: 'gpt-4o-mini',
    systemPrompt,
    userPrompt,
    temperature: 0.5,
    maxTokens: 500,
    feature: 'pulse_teaching',
  });

  return {
    answer:
      result.success && result.content
        ? result.content
        : "I'm not sure how to answer that. Try asking about AGI, jobs, households, or call intelligence.",
    sources: (docs || []).map((d) => ({ title: d.title, slug: d.slug })),
  };
}
```

---

## 2.3. Teaching API

Create: `app/api/pulse/ask/route.ts`

```ts
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { answerPulseQuestion } from '@/lib/teaching/engine';

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const body = await req.json();
    const { question, context } = body;

    if (!question || typeof question !== 'string') {
      return NextResponse.json({ error: 'question is required' }, { status: 400 });
    }

    const answer = await answerPulseQuestion(userId, question, context);

    return NextResponse.json(answer);
  } catch (err: any) {
    console.error('[API][Teaching] Error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
```

---

## 2.4. Teaching UI Entrypoints

Create component: `components/teaching/AskPulseWidget.tsx`

```tsx
'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { AppCard } from '@/components/ui/AppCard';
import { HelpCircle, Send } from 'lucide-react';

export function AskPulseWidget() {
  const [question, setQuestion] = useState('');
  const [loading, setLoading] = useState(false);
  const [answer, setAnswer] = useState<string | null>(null);
  const [sources, setSources] = useState<any[]>([]);

  async function handleAsk() {
    if (!question.trim()) return;

    setLoading(true);
    setAnswer(null);
    setSources([]);

    try {
      const res = await fetch('/api/pulse/ask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question }),
      });

      if (res.ok) {
        const data = await res.json();
        setAnswer(data.answer);
        setSources(data.sources || []);
      }
    } catch (err) {
      console.error('Failed to ask Pulse', err);
      setAnswer("I'm having trouble answering that right now. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <AppCard className="p-4">
      <div className="flex items-center gap-2 mb-4">
        <HelpCircle className="w-5 h-5 text-white" />
        <h3 className="text-white font-semibold">Ask Pulse about Pulse</h3>
      </div>
      <div className="space-y-3">
        <div className="flex gap-2">
          <Input
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAsk()}
            placeholder="e.g., What is the AGI Kernel?"
            className="flex-1"
          />
          <Button onClick={handleAsk} disabled={loading}>
            <Send className="w-4 h-4" />
          </Button>
        </div>
        {answer && (
          <div className="p-3 bg-black/30 rounded text-white/80 text-sm">
            {answer}
          </div>
        )}
        {sources.length > 0 && (
          <div className="text-xs text-white/60">
            Sources: {sources.map((s) => s.title).join(', ')}
          </div>
        )}
      </div>
    </AppCard>
  );
}
```

Add to key pages (AGI Command Center, Settings, etc.)

---

# SECTION 3 — DEMO & SCENARIO PACKS

We want built-in demo flows that create synthetic data and show AGI in action.

## 3.1. Scenario Schema

Migration: `supabase/migrations/20251230_agi_scenarios_v1.sql`

```sql
-- ============================================
-- PULSE AGI SCENARIOS V1
-- Demo scenarios for showcasing Pulse
-- ============================================

create table if not exists public.agi_scenarios (
  id uuid primary key default gen_random_uuid(),
  key text unique not null,                 -- 'lender_demo', 'sales_demo', 'household_demo'
  name text not null,
  description text,
  config jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.agi_scenario_runs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  scenario_key text not null,
  created_at timestamptz not null default now()
);

create index if not exists agi_scenario_runs_user_id_idx
  on public.agi_scenario_runs(user_id);
```

---

## 3.2. Scenario Runner

Create: `lib/agi/scenarios/runner.ts`

```ts
import { supabaseAdmin } from '@/lib/supabase';
import { runAGIKernel } from '@/lib/agi/kernel';
import { installVerticalPack } from '@/lib/verticals/generator';
import { createHousehold } from '@/lib/household/model';

async function resolveUserId(clerkId: string): Promise<string> {
  const { data: userRow } = await supabaseAdmin
    .from("users")
    .select("id")
    .eq("clerk_id", clerkId)
    .maybeSingle();

  return userRow?.id || clerkId;
}

export async function runScenario(userId: string, scenarioKey: string): Promise<void> {
  const dbUserId = await resolveUserId(userId);

  switch (scenarioKey) {
    case 'lender_demo': {
      // Install banking vertical if not already installed
      await installVerticalPack(userId, 'Commercial Loan Officer');

      // Create demo deals
      const demoDeals = [
        {
          name: 'Dollar General Store Acquisition',
          status: 'active',
          banking_deal_profiles: {
            facility_type: 'SBA_7a',
            requested_amount: 2500000,
            dscr: 1.28,
            ltv: 0.72,
            risk_bucket: 'Moderate',
          },
        },
        {
          name: 'Ponderosa Campground Refinance',
          status: 'active',
          banking_deal_profiles: {
            facility_type: 'CRE',
            requested_amount: 1800000,
            dscr: 1.15,
            ltv: 0.85,
            risk_bucket: 'High',
          },
        },
      ];

      for (const deal of demoDeals) {
        const { data: dealRow } = await supabaseAdmin
          .from('deals')
          .insert({
            user_id: dbUserId,
            name: deal.name,
            status: deal.status,
          })
          .select('id')
          .single();

        if (dealRow) {
          await supabaseAdmin.from('banking_deal_profiles').insert({
            deal_id: dealRow.id,
            ...deal.banking_deal_profiles,
          });
        }
      }

      // Run AGI
      await runAGIKernel(userId, {
        type: 'manual',
        source: 'scenario:lender_demo',
      });

      break;
    }

    case 'household_demo': {
      // Create demo household
      const householdId = await createHousehold(userId, 'Demo Household');

      // Create demo tasks
      await supabaseAdmin.from('household_tasks').insert([
        {
          household_id: householdId,
          created_by_user_id: dbUserId,
          title: 'Plan weekend family activity',
          status: 'pending',
        },
        {
          household_id: householdId,
          created_by_user_id: dbUserId,
          title: 'Coordinate school pickup schedule',
          status: 'pending',
        },
      ]);

      // Create demo calendar events
      await supabaseAdmin.from('household_calendar_events').insert([
        {
          household_id: householdId,
          created_by_user_id: dbUserId,
          title: 'Family Dinner',
          start_time: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
        },
      ]);

      // Run AGI
      await runAGIKernel(userId, {
        type: 'manual',
        source: 'scenario:household_demo',
      });

      break;
    }

    case 'generic_demo': {
      // Create demo tasks
      await supabaseAdmin.from('tasks').insert([
        {
          user_id: dbUserId,
          name: 'Review quarterly goals',
          status: 'pending',
          priority: 0.8,
        },
        {
          user_id: dbUserId,
          name: 'Schedule team meeting',
          status: 'pending',
          priority: 0.6,
        },
      ]);

      // Run AGI
      await runAGIKernel(userId, {
        type: 'manual',
        source: 'scenario:generic_demo',
      });

      break;
    }
  }

  // Record scenario run
  await supabaseAdmin.from('agi_scenario_runs').insert({
    user_id: dbUserId,
    scenario_key: scenarioKey,
  });
}
```

---

## 3.3. Scenario API

Create: `app/api/agi/scenarios/run/route.ts`

```ts
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { runScenario } from '@/lib/agi/scenarios/runner';

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const body = await req.json();
    const { scenarioKey } = body;

    if (!scenarioKey) {
      return NextResponse.json({ error: 'scenarioKey is required' }, { status: 400 });
    }

    await runScenario(userId, scenarioKey);

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    console.error('[API][Scenarios] Error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
```

---

# SECTION 4 — AGI TELEMETRY & HEALTH DASHBOARD

We want visibility into AGI performance.

## 4.1. Metrics Table

Migration: `supabase/migrations/20251230_agi_telemetry_v1.sql`

```sql
-- ============================================
-- PULSE AGI TELEMETRY V1
-- Performance metrics and health tracking
-- ============================================

create table if not exists public.agi_telemetry (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users(id) on delete cascade,
  org_id uuid references organizations(id),

  run_id uuid,
  agent_name text,
  action_count int not null default 0,
  duration_ms int not null,
  error text,
  created_at timestamptz not null default now()
);

create index if not exists agi_telemetry_user_id_idx
  on public.agi_telemetry(user_id);

create index if not exists agi_telemetry_created_at_idx
  on public.agi_telemetry(created_at);
```

---

## 4.2. Telemetry Hooks

Update `lib/agi/kernel.ts`:

```ts
// Add telemetry logging
import { supabaseAdmin } from '@/lib/supabase';

async function logTelemetry(params: {
  userId: string;
  runId?: string;
  agentName: string;
  actionCount: number;
  durationMs: number;
  error?: string;
}) {
  const dbUserId = await resolveUserId(params.userId);
  await supabaseAdmin.from('agi_telemetry').insert({
    user_id: dbUserId,
    run_id: params.runId,
    agent_name: params.agentName,
    action_count: params.actionCount,
    duration_ms: params.durationMs,
    error: params.error || null,
  });
}

// In runAGIKernel, after each agent run:
const agentStartTime = Date.now();
try {
  const result = await agent.run({ userId, world, trigger });
  const durationMs = Date.now() - agentStartTime;
  await logTelemetry({
    userId,
    runId: runResult.runId,
    agentName: agent.name,
    actionCount: result.proposedActions.length,
    durationMs,
  });
} catch (err: any) {
  const durationMs = Date.now() - agentStartTime;
  await logTelemetry({
    userId,
    runId: runResult.runId,
    agentName: agent.name,
    actionCount: 0,
    durationMs,
    error: err.message,
  });
}
```

---

## 4.3. AGI Health UI

Create: `app/(authenticated)/agi/health/page.tsx`

```tsx
'use client';

import { useState, useEffect } from 'react';
import { AppCard } from '@/components/ui/AppCard';

export default function AGIHealthPage() {
  const [metrics, setMetrics] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMetrics();
  }, []);

  async function fetchMetrics() {
    try {
      const res = await fetch('/api/agi/health');
      if (res.ok) {
        const data = await res.json();
        setMetrics(data);
      }
    } catch (err) {
      console.error('Failed to fetch metrics', err);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return <div className="container mx-auto p-6">Loading...</div>;
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <h1 className="text-2xl font-bold text-white">AGI Health Dashboard</h1>

      <AppCard className="p-6">
        <h2 className="text-xl font-semibold text-white mb-4">Overview</h2>
        <div className="grid grid-cols-3 gap-4">
          <div>
            <div className="text-white/60 text-sm">Runs Today</div>
            <div className="text-white text-2xl">{metrics?.runsToday || 0}</div>
          </div>
          <div>
            <div className="text-white/60 text-sm">Avg Duration</div>
            <div className="text-white text-2xl">{metrics?.avgDurationMs || 0}ms</div>
          </div>
          <div>
            <div className="text-white/60 text-sm">Total Actions</div>
            <div className="text-white text-2xl">{metrics?.totalActions || 0}</div>
          </div>
        </div>
      </AppCard>

      <AppCard className="p-6">
        <h2 className="text-xl font-semibold text-white mb-4">Top Agents</h2>
        <div className="space-y-2">
          {(metrics?.topAgents || []).map((agent: any) => (
            <div key={agent.name} className="flex justify-between text-white">
              <span>{agent.name}</span>
              <span>{agent.actionCount} actions</span>
            </div>
          ))}
        </div>
      </AppCard>
    </div>
  );
}
```

Create API: `app/api/agi/health/route.ts`

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

export async function GET(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const dbUserId = await resolveUserId(userId);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Runs today
    const { count: runsToday } = await supabaseAdmin
      .from('agi_telemetry')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', dbUserId)
      .gte('created_at', today.toISOString());

    // Avg duration
    const { data: durations } = await supabaseAdmin
      .from('agi_telemetry')
      .select('duration_ms')
      .eq('user_id', dbUserId)
      .gte('created_at', today.toISOString());

    const avgDurationMs =
      durations && durations.length > 0
        ? Math.round(durations.reduce((sum, d) => sum + d.duration_ms, 0) / durations.length)
        : 0;

    // Total actions
    const { data: actions } = await supabaseAdmin
      .from('agi_telemetry')
      .select('action_count')
      .eq('user_id', dbUserId)
      .gte('created_at', today.toISOString());

    const totalActions =
      actions && actions.length > 0
        ? actions.reduce((sum, a) => sum + a.action_count, 0)
        : 0;

    // Top agents
    const { data: agentStats } = await supabaseAdmin
      .from('agi_telemetry')
      .select('agent_name, action_count')
      .eq('user_id', dbUserId)
      .gte('created_at', today.toISOString());

    const agentMap = new Map<string, number>();
    agentStats?.forEach((stat) => {
      const current = agentMap.get(stat.agent_name) || 0;
      agentMap.set(stat.agent_name, current + stat.action_count);
    });

    const topAgents = Array.from(agentMap.entries())
      .map(([name, actionCount]) => ({ name, actionCount }))
      .sort((a, b) => b.actionCount - a.actionCount)
      .slice(0, 10);

    return NextResponse.json({
      runsToday: runsToday || 0,
      avgDurationMs,
      totalActions,
      topAgents,
    });
  } catch (err: any) {
    console.error('[API][AGI Health] Error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
```

---

# SECTION 5 — GUARDRAILS & DEFAULTS FOR PUBLIC BETA

We want safe defaults for new users.

## 5.1. Default Settings Helper

Update `lib/agi/settings.ts`:

```ts
export async function ensureDefaultSettings(userId: string): Promise<void> {
  const dbUserId = await resolveUserId(userId);

  const { data: existing } = await supabaseAdmin
    .from('user_agi_settings')
    .select('id')
    .eq('user_id', dbUserId)
    .maybeSingle();

  if (existing) return; // Already has settings

  // Create safe defaults
  await supabaseAdmin.from('user_agi_settings').insert({
    user_id: dbUserId,
    level: 'assist',
    max_runs_per_day: 12,
    require_confirmation_for_high_impact: true,
    mode: 'scout',
  });
}
```

Call this in:
- On login (middleware or auth callback)
- During onboarding

---

## 5.2. High-Impact Action Confirmation

Update `lib/agi/executor.ts`:

```ts
async function isActionAllowedBySettings(
  userId: string,
  action: AGIAction,
  settings: UserAGISettings,
): Promise<boolean> {
  // High-impact actions always require confirmation unless explicitly allowed
  if (action.riskLevel === 'high' || action.requiresConfirmation) {
    if (settings.level === 'autopilot' && !settings.require_confirmation_for_high_impact) {
      // User explicitly disabled high-impact confirmation
      return true;
    }
    // Require confirmation
    return false;
  }

  // Check action type restrictions
  const restrictedTypes = ['send_email', 'update_finance_plan', 'schedule_meeting'];
  if (restrictedTypes.includes(action.type)) {
    if (settings.level === 'autopilot') {
      // Check if user has explicitly allowed this domain
      // For now, require confirmation
      return false;
    }
  }

  return true;
}
```

---

# SECTION 6 — UX POLISH: HOME & AGI SURFACES

## 6.1. Home Dashboard Updates

Update `/app/(authenticated)/page.tsx`:

```tsx
'use client';

import { useEffect, useState } from 'react';
import { useUser } from '@clerk/nextjs';
import { AppCard } from '@/components/ui/AppCard';
import { AskPulseWidget } from '@/components/teaching/AskPulseWidget';
import { TalkToPulseWidget } from '@/components/voice/TalkToPulseWidget';

export default function HomePage() {
  const { user } = useUser();
  const [onboardingComplete, setOnboardingComplete] = useState(true);
  const [homeData, setHomeData] = useState<any>(null);

  useEffect(() => {
    checkOnboarding();
    fetchHomeData();
  }, []);

  async function checkOnboarding() {
    const res = await fetch('/api/onboarding/state');
    if (res.ok) {
      const { complete } = await res.json();
      setOnboardingComplete(complete);
      if (!complete) {
        window.location.href = '/onboarding';
      }
    }
  }

  async function fetchHomeData() {
    const res = await fetch('/api/mobile/home');
    if (res.ok) {
      const data = await res.json();
      setHomeData(data);
    }
  }

  if (!onboardingComplete) {
    return null; // Will redirect
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <h1 className="text-2xl font-bold text-white">Welcome back, {user?.firstName}</h1>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <AppCard className="p-6">
          <h2 className="text-xl font-semibold text-white mb-4">Today</h2>
          {/* Today's tasks and events */}
        </AppCard>

        <AppCard className="p-6">
          <h2 className="text-xl font-semibold text-white mb-4">AGI Suggestions</h2>
          {/* Latest AGI actions */}
        </AppCard>
      </div>

      <TalkToPulseWidget />
      <AskPulseWidget />
    </div>
  );
}
```

---

## 6.2. Command Center Enhancements

Update `/agi/command-center` to add:
- "Run Demo" section
- "Help me understand this run" button

---

# SECTION 7 — ACCEPTANCE CRITERIA

Phase 13 is **done** when:

1. **Onboarding**
   * New user logs in → guided through job(s), household choice, AGI level
   * At end, they can run first AGI or demo scenario
   * Incomplete onboarding redirects from root

2. **Teaching**
   * "?" button exists in key places
   * User can ask "What is AGI?" and get Pulse-aware answer
   * Answers reference user's setup (jobs, household)

3. **Demo Scenarios**
   * At least one vertical demo (banking) and one household demo
   * `runScenario` seeds realistic synthetic data
   * AGI produces visible plans/actions in UI

4. **Telemetry**
   * `agi_telemetry` has rows after AGI runs
   * `/agi/health` visualizes basic AGI metrics

5. **Safety Defaults**
   * New users get AGI level `assist` and safe limits
   * High-impact actions always require confirmation unless explicitly overridden

---

**End of spec.**


