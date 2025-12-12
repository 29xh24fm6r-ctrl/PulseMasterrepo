# 🧠 PULSE OS — PHASE 14 MEGA SPEC

## Communication Mastery Engine + Philosophy Dojo v3 (Samurai / Stoic / Etc.)

> **You are:** Senior Staff Engineer on Pulse OS (Next.js 16 + Supabase + TypeScript).

> **Goal:**

> Build the **Communication Mastery Engine** and **Philosophy Dojo v3**, both deeply integrated with AGI, vertical packs, and voice — so Pulse can actively train users in:

>
> * High-stakes communication (sales, leadership, relationships, conflict)

> * Philosophical frameworks (Stoic, Samurai/Bushidō, etc.) as *living practice systems*

Phases 1–13 are assumed to be in place:

* AGI Kernel + multi-agent mesh

* Vertical/job packs

* Household / org / team AGI

* Voice OS (Talk to Pulse)

* Call Intelligence + mobile shell

* Onboarding, teaching system, demos, telemetry

---

## 0. GUIDING PRINCIPLES

1. **Real-life grounded**: Training should connect to *actual* calls, emails, meetings, and conflicts — not just abstract scripts.

2. **Vertical-aware**: Communication coaching should adapt based on job vertical (banking, sales, engineering, etc.).

3. **Philosophy as practice, not quotes**: Dojo = drills, scenarios, decisions, reflections — with XP/levels if available.

4. **Voice-native**: Everything must work with Talk-to-Pulse as a natural entrypoint.

---

# SECTION 1 — DATABASE LAYER

Create migrations in `/supabase/migrations/`.

## 1.1. Communication Mastery Schema

### 1.1.1. `20251231_communication_programs_v1.sql`

```sql
-- ============================================
-- PULSE COMMUNICATION MASTERY V1
-- Training programs, sessions, and turns
-- ============================================

create table if not exists public.communication_programs (
  id uuid primary key default gen_random_uuid(),
  key text not null,               -- 'core_basics', 'sales_calls', 'difficult_conversations', 'leadership_1on1s'
  name text not null,
  description text,
  config jsonb not null default '{}'::jsonb, -- structure, levels, modules
  created_at timestamptz not null default now()
);

create unique index if not exists communication_programs_key_unique
  on public.communication_programs(key);

create table if not exists public.communication_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  program_key text not null,       -- fk to communication_programs.key (logical)
  mode text not null,              -- 'roleplay', 'analysis', 'drill'
  context jsonb not null default '{}'::jsonb, -- e.g. { "deal_id": "...", "relationship_id": "...", "call_id": "..." }
  status text not null default 'active', -- 'active', 'completed', 'aborted'
  score numeric,                   -- overall score 0-100, optional
  created_at timestamptz not null default now(),
  completed_at timestamptz
);

create index if not exists communication_sessions_user_id_idx
  on public.communication_sessions(user_id);

create table if not exists public.communication_turns (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.communication_sessions(id) on delete cascade,
  turn_index int not null,
  speaker text not null,           -- 'user', 'coach', 'system'
  content text not null,           -- text transcript of that utterance
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists communication_turns_session_id_idx
  on public.communication_turns(session_id);
```

---

## 1.2. Philosophy Dojo v3 Schema

### 1.2.1. `20251231_philosophy_dojo_v3.sql`

```sql
-- ============================================
-- PULSE PHILOSOPHY DOJO V3
-- Philosophy schools, lessons, exercises, and user progress
-- ============================================

create table if not exists public.philosophy_schools (
  id uuid primary key default gen_random_uuid(),
  key text not null,       -- 'stoicism', 'samurai', 'buddhism', etc.
  name text not null,
  description text,
  created_at timestamptz not null default now()
);

create unique index if not exists philosophy_schools_key_unique
  on public.philosophy_schools(key);

create table if not exists public.philosophy_lessons (
  id uuid primary key default gen_random_uuid(),
  school_key text not null,       -- fk to philosophy_schools.key (logical)
  key text not null,              -- 'dichotomy_of_control', 'memento_mori', 'musashi_distance'
  title text not null,
  content_md text not null,       -- markdown explanation
  difficulty int not null default 1, -- 1-5
  created_at timestamptz not null default now()
);

create unique index if not exists philosophy_lessons_key_unique
  on public.philosophy_lessons(school_key, key);

create table if not exists public.philosophy_exercises (
  id uuid primary key default gen_random_uuid(),
  lesson_id uuid not null references public.philosophy_lessons(id) on delete cascade,
  key text not null,              -- 'reflection_prompt', 'scenario_drill', etc.
  prompt_md text not null,        -- what user sees
  type text not null,             -- 'reflection', 'scenario', 'decision', 'journaling'
  created_at timestamptz not null default now()
);

create index if not exists philosophy_exercises_lesson_id_idx
  on public.philosophy_exercises(lesson_id);

create table if not exists public.user_philosophy_progress (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  school_key text not null,
  lesson_id uuid references public.philosophy_lessons(id),
  exercise_id uuid references public.philosophy_exercises(id),
  status text not null default 'assigned', -- 'assigned', 'completed', 'skipped'
  response text,
  score numeric,
  feedback text,
  created_at timestamptz not null default now(),
  completed_at timestamptz
);

create index if not exists user_philosophy_progress_user_idx
  on public.user_philosophy_progress(user_id);

create index if not exists user_philosophy_progress_school_idx
  on public.user_philosophy_progress(school_key);
```

---

# SECTION 2 — COMMUNICATION MASTERY ENGINE

Create directory: `/lib/communication/`.

## 2.1. `programs.ts`

Responsibilities:

* Seed default `communication_programs` rows
* Load and manage program configurations

```ts
import { supabaseAdmin } from '@/lib/supabase';

export interface CommunicationProgramConfig {
  levels: {
    key: string;
    name: string;
    description: string;
    recommendedSequence: string[]; // module keys
  }[];
  modules: {
    key: string;
    name: string;
    type: 'roleplay' | 'analysis' | 'drill';
    description: string;
  }[];
}

export interface CommunicationProgram {
  id: string;
  key: string;
  name: string;
  description: string;
  config: CommunicationProgramConfig;
}

export async function getCommunicationPrograms(): Promise<CommunicationProgram[]> {
  const { data, error } = await supabaseAdmin
    .from('communication_programs')
    .select('*');

  if (error) {
    console.error('[Communication] Failed to load programs', error);
    return [];
  }

  return (data || []).map((row) => ({
    id: row.id,
    key: row.key,
    name: row.name,
    description: row.description,
    config: row.config as CommunicationProgramConfig,
  }));
}

export async function seedDefaultPrograms(): Promise<void> {
  const programs = [
    {
      key: 'core_basics',
      name: 'Core Communication Basics',
      description: 'Listening, clarity, empathy, and foundational skills',
      config: {
        levels: [
          {
            key: 'level_1',
            name: 'Foundations',
            description: 'Basic listening and clarity',
            recommendedSequence: ['active_listening', 'clear_messaging'],
          },
        ],
        modules: [
          {
            key: 'active_listening',
            name: 'Active Listening',
            type: 'drill',
            description: 'Practice listening and reflecting back',
          },
          {
            key: 'clear_messaging',
            name: 'Clear Messaging',
            type: 'drill',
            description: 'Practice concise, clear communication',
          },
        ],
      },
    },
    {
      key: 'sales_calls',
      name: 'Sales Call Mastery',
      description: 'Discovery, objection handling, and closing techniques',
      config: {
        levels: [
          {
            key: 'level_1',
            name: 'Discovery',
            description: 'Asking great questions',
            recommendedSequence: ['discovery_questions', 'objection_handling'],
          },
        ],
        modules: [
          {
            key: 'discovery_questions',
            name: 'Discovery Questions',
            type: 'roleplay',
            description: 'Practice asking discovery questions',
          },
          {
            key: 'objection_handling',
            name: 'Objection Handling',
            type: 'roleplay',
            description: 'Practice handling common objections',
          },
        ],
      },
    },
    {
      key: 'difficult_conversations',
      name: 'Difficult Conversations',
      description: 'Conflict resolution, feedback delivery, and tough talks',
      config: {
        levels: [
          {
            key: 'level_1',
            name: 'Foundation',
            description: 'Basic difficult conversation skills',
            recommendedSequence: ['feedback_delivery', 'conflict_resolution'],
          },
        ],
        modules: [
          {
            key: 'feedback_delivery',
            name: 'Feedback Delivery',
            type: 'roleplay',
            description: 'Practice delivering constructive feedback',
          },
          {
            key: 'conflict_resolution',
            name: 'Conflict Resolution',
            type: 'roleplay',
            description: 'Practice resolving conflicts',
          },
        ],
      },
    },
    {
      key: 'leadership_1on1s',
      name: 'Leadership 1-on-1s',
      description: 'Coaching style, accountability, and team development',
      config: {
        levels: [
          {
            key: 'level_1',
            name: 'Coaching Basics',
            description: 'Fundamental coaching skills',
            recommendedSequence: ['coaching_questions', 'accountability'],
          },
        ],
        modules: [
          {
            key: 'coaching_questions',
            name: 'Coaching Questions',
            type: 'roleplay',
            description: 'Practice asking coaching questions',
          },
          {
            key: 'accountability',
            name: 'Accountability Conversations',
            type: 'roleplay',
            description: 'Practice accountability conversations',
          },
        ],
      },
    },
  ];

  for (const program of programs) {
    await supabaseAdmin
      .from('communication_programs')
      .upsert(program, { onConflict: 'key' });
  }
}
```

---

## 2.2. `sessions.ts`

Implement core session functions.

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

export interface CommunicationSession {
  id: string;
  user_id: string;
  program_key: string;
  mode: 'roleplay' | 'analysis' | 'drill';
  context: any;
  status: 'active' | 'completed' | 'aborted';
  score?: number;
  created_at: string;
  completed_at?: string;
}

export async function startCommunicationSession(
  userId: string,
  programKey: string,
  mode: 'roleplay' | 'analysis' | 'drill',
  context: any = {},
): Promise<CommunicationSession> {
  const dbUserId = await resolveUserId(userId);

  const { data, error } = await supabaseAdmin
    .from('communication_sessions')
    .insert({
      user_id: dbUserId,
      program_key: programKey,
      mode,
      context,
      status: 'active',
    })
    .select('*')
    .single();

  if (error || !data) {
    throw new Error('[Communication] Failed to start session');
  }

  return data as CommunicationSession;
}

export async function appendCommunicationTurn(
  sessionId: string,
  speaker: 'user' | 'coach' | 'system',
  content: string,
  metadata: any = {},
): Promise<void> {
  // Get last turn_index
  const { data: last } = await supabaseAdmin
    .from('communication_turns')
    .select('turn_index')
    .eq('session_id', sessionId)
    .order('turn_index', { ascending: false })
    .limit(1)
    .maybeSingle();

  const nextIndex = typeof last?.turn_index === 'number' ? last.turn_index + 1 : 0;

  const { error } = await supabaseAdmin.from('communication_turns').insert({
    session_id: sessionId,
    turn_index: nextIndex,
    speaker,
    content,
    metadata,
  });

  if (error) {
    console.error('[Communication] Failed to append turn', error);
    throw new Error('Failed to append communication turn');
  }
}

export async function completeCommunicationSession(
  sessionId: string,
  score?: number,
): Promise<void> {
  const { error } = await supabaseAdmin
    .from('communication_sessions')
    .update({
      status: 'completed',
      completed_at: new Date().toISOString(),
      score: score || null,
    })
    .eq('id', sessionId);

  if (error) {
    console.error('[Communication] Failed to complete session', error);
    throw new Error('Failed to complete communication session');
  }
}
```

---

## 2.3. `roleplay_engine.ts`

Create a conversational roleplay engine.

```ts
import { startCommunicationSession, appendCommunicationTurn } from './sessions';
import { callAI } from '@/lib/ai/call';
import { getUserVerticalPacks } from '@/lib/verticals/generator';

export interface RoleplayContext {
  deal_id?: string;
  relationship_id?: string;
  call_id?: string;
  scenario?: string;
}

export async function startRoleplay(
  userId: string,
  programKey: string,
  context: RoleplayContext = {},
): Promise<{ sessionId: string; initialMessage: string }> {
  const session = await startCommunicationSession(userId, programKey, 'roleplay', context);

  // Load user context
  const verticalPacks = await getUserVerticalPacks(userId);
  const jobContext = verticalPacks.length > 0
    ? `User's job: ${verticalPacks.map((p) => p.jobTitle).join(', ')}`
    : '';

  // Generate initial scenario
  const systemPrompt = `You are a communication coach running a roleplay session. Create a realistic scenario based on the program and user context. Be supportive but challenging.`;

  const userPrompt = `Program: ${programKey}
${jobContext}
${context.scenario ? `Scenario context: ${context.scenario}` : ''}

Create an initial scenario description and set up the roleplay. Explain:
1. The situation
2. The user's role
3. The counterpart's role
4. The goal of this conversation

Start with a brief setup, then begin the roleplay as the counterpart.`;

  const result = await callAI({
    userId,
    model: 'gpt-4o-mini',
    systemPrompt,
    userPrompt,
    temperature: 0.7,
    maxTokens: 500,
    feature: 'communication_roleplay',
  });

  const initialMessage = result.success && result.content
    ? result.content
    : "Let's start a roleplay session. I'll set up a scenario for you.";

  await appendCommunicationTurn(session.id, 'coach', initialMessage);

  return {
    sessionId: session.id,
    initialMessage,
  };
}

export async function continueRoleplay(
  sessionId: string,
  userId: string,
  userMessage: string,
): Promise<{ coachMessage: string; feedback?: string; score?: number }> {
  // Load session and turns
  const { data: session } = await supabaseAdmin
    .from('communication_sessions')
    .select('*')
    .eq('id', sessionId)
    .single();

  if (!session) {
    throw new Error('Session not found');
  }

  const { data: turns } = await supabaseAdmin
    .from('communication_turns')
    .select('*')
    .eq('session_id', sessionId)
    .order('turn_index', { ascending: true });

  // Append user turn
  await appendCommunicationTurn(sessionId, 'user', userMessage);

  // Load user context
  const verticalPacks = await getUserVerticalPacks(userId);
  const jobContext = verticalPacks.length > 0
    ? `User's job: ${verticalPacks.map((p) => p.jobTitle).join(', ')}`
    : '';

  // Build conversation history
  const history = (turns || [])
    .map((t) => `${t.speaker}: ${t.content}`)
    .join('\n');

  const systemPrompt = `You are a communication coach running a roleplay session. You play the counterpart (customer, employee, etc.) and provide coaching feedback. Be realistic and helpful.`;

  const userPrompt = `Program: ${session.program_key}
${jobContext}

Conversation so far:
${history}

User just said: "${userMessage}"

Respond as the counterpart, then provide brief coaching feedback if appropriate.`;

  const result = await callAI({
    userId,
    model: 'gpt-4o-mini',
    systemPrompt,
    userPrompt,
    temperature: 0.7,
    maxTokens: 400,
    feature: 'communication_roleplay',
  });

  const coachMessage = result.success && result.content
    ? result.content
    : "I'm here to help you practice. What would you like to say next?";

  await appendCommunicationTurn(sessionId, 'coach', coachMessage);

  return {
    coachMessage,
  };
}
```

---

## 2.4. `analysis_engine.ts`

This feeds off **real calls & messages**.

```ts
import { supabaseAdmin } from '@/lib/supabase';
import { startCommunicationSession, appendCommunicationTurn, completeCommunicationSession } from './sessions';
import { callAI } from '@/lib/ai/call';

async function resolveUserId(clerkId: string): Promise<string> {
  const { data: userRow } = await supabaseAdmin
    .from("users")
    .select("id")
    .eq("clerk_id", clerkId)
    .maybeSingle();

  return userRow?.id || clerkId;
}

export async function analyzeCallCommunication(
  userId: string,
  callId: string,
  programKey?: string,
): Promise<{ sessionId: string; analysis: string; score: number }> {
  const dbUserId = await resolveUserId(userId);

  // Load call data
  const { data: call } = await supabaseAdmin
    .from('call_sessions')
    .select('*')
    .eq('id', callId)
    .single();

  if (!call) {
    throw new Error('Call not found');
  }

  const { data: segments } = await supabaseAdmin
    .from('call_segments')
    .select('*')
    .eq('call_id', callId)
    .order('segment_index', { ascending: true });

  const { data: summary } = await supabaseAdmin
    .from('call_summaries')
    .select('*')
    .eq('call_id', callId)
    .maybeSingle();

  const transcript = (segments || [])
    .map((s) => `${s.speaker}: ${s.transcript}`)
    .join('\n');

  // Create analysis session
  const session = await startCommunicationSession(
    userId,
    programKey || 'core_basics',
    'analysis',
    { call_id: callId },
  );

  // Run LLM analysis
  const systemPrompt = `You are a communication coach analyzing a phone call. Evaluate:
1. Clarity of communication
2. Listening ratio (user vs counterpart)
3. Question quality
4. Objection handling (if applicable)
5. Overall effectiveness

Provide a scored rubric (0-100) and specific feedback.`;

  const userPrompt = `Call Summary: ${summary?.high_level_summary || 'N/A'}

Transcript:
${transcript}

Analyze this call and provide:
1. Overall score (0-100)
2. Strengths
3. Areas for improvement
4. Specific recommendations`;

  const result = await callAI({
    userId,
    model: 'gpt-4o-mini',
    systemPrompt,
    userPrompt,
    temperature: 0.3,
    maxTokens: 800,
    feature: 'communication_analysis',
  });

  const analysis = result.success && result.content
    ? result.content
    : 'Analysis could not be generated.';

  // Extract score (heuristic: look for number 0-100)
  const scoreMatch = analysis.match(/\b(\d{1,2}|100)\b/);
  const score = scoreMatch ? parseInt(scoreMatch[1], 10) : 70;

  await appendCommunicationTurn(session.id, 'coach', analysis);
  await completeCommunicationSession(session.id, score);

  return {
    sessionId: session.id,
    analysis,
    score,
  };
}
```

---

# SECTION 3 — PHILOSOPHY DOJO V3 ENGINE

Create directory: `/lib/philosophy/dojo_v3/`.

## 3.1. `catalog.ts`

Seed philosophy schools, lessons, and exercises.

```ts
import { supabaseAdmin } from '@/lib/supabase';

export async function seedPhilosophySchools(): Promise<void> {
  const schools = [
    {
      key: 'stoicism',
      name: 'Stoicism',
      description: 'Ancient philosophy focused on virtue, reason, and acceptance of what we cannot control.',
    },
    {
      key: 'samurai',
      name: 'Samurai / Bushidō',
      description: 'The way of the warrior: honor, discipline, presence, and embracing impermanence.',
    },
  ];

  for (const school of schools) {
    await supabaseAdmin
      .from('philosophy_schools')
      .upsert(school, { onConflict: 'key' });
  }
}

export async function seedPhilosophyLessons(): Promise<void> {
  const lessons = [
    {
      school_key: 'stoicism',
      key: 'dichotomy_of_control',
      title: 'Dichotomy of Control',
      content_md: `The Stoic dichotomy of control teaches us to distinguish between what we can control and what we cannot.

**What we can control:**
- Our judgments
- Our values
- Our actions
- Our responses

**What we cannot control:**
- External events
- Other people's actions
- Past events
- Future outcomes

Focus your energy only on what you can control.`,
      difficulty: 1,
    },
    {
      school_key: 'stoicism',
      key: 'view_from_above',
      title: 'View from Above',
      content_md: `The "view from above" is a Stoic meditation practice. Imagine yourself rising above your current situation, seeing it from a cosmic perspective. This helps reduce anxiety and gain clarity.`,
      difficulty: 2,
    },
    {
      school_key: 'samurai',
      key: 'musashi_distance',
      title: 'Musashi\'s Distance',
      content_md: `Miyamoto Musashi taught the importance of maintaining proper distance—not just in combat, but in all interactions. Too close and you lose perspective; too far and you lose connection.`,
      difficulty: 2,
    },
    {
      school_key: 'samurai',
      key: 'embrace_of_death',
      title: 'Embracing Impermanence',
      content_md: `The samurai embraced the reality of death not as morbidity, but as a source of courage and presence. By accepting impermanence, we can act with full commitment and without fear.`,
      difficulty: 3,
    },
  ];

  for (const lesson of lessons) {
    await supabaseAdmin
      .from('philosophy_lessons')
      .upsert(lesson, { onConflict: 'school_key,key' });
  }
}

export async function seedPhilosophyExercises(): Promise<void> {
  // Get lessons
  const { data: lessons } = await supabaseAdmin
    .from('philosophy_lessons')
    .select('id, school_key, key');

  if (!lessons) return;

  const exercises = [];

  for (const lesson of lessons) {
    if (lesson.key === 'dichotomy_of_control') {
      exercises.push({
        lesson_id: lesson.id,
        key: 'control_reflection',
        prompt_md: `Think about a current challenge in your life. List:
1. What aspects can you control?
2. What aspects cannot be controlled?
3. How can you shift your focus to what you can control?`,
        type: 'reflection',
      });
      exercises.push({
        lesson_id: lesson.id,
        key: 'control_scenario',
        prompt_md: `Scenario: You have an important presentation tomorrow, and you're worried about technical issues.

Apply the dichotomy of control:
- What can you control? (preparation, backup plans, your mindset)
- What can't you control? (equipment failures, audience reactions)

How would you approach this situation?`,
        type: 'scenario',
      });
    }

    if (lesson.key === 'view_from_above') {
      exercises.push({
        lesson_id: lesson.id,
        key: 'cosmic_meditation',
        prompt_md: `Take 5 minutes to practice the view from above:

1. Close your eyes and imagine rising above your current location
2. See yourself from above, then the city, then the planet
3. From this perspective, reflect on your current concerns
4. How do they appear from this distance?

Write your reflections.`,
        type: 'reflection',
      });
    }

    if (lesson.key === 'musashi_distance') {
      exercises.push({
        lesson_id: lesson.id,
        key: 'distance_analysis',
        prompt_md: `Think about an important relationship or situation. Analyze:

1. Are you too close? (losing perspective, emotional overwhelm)
2. Are you too far? (disconnected, missing nuance)
3. What is the optimal distance for clarity and effectiveness?

How can you adjust?`,
        type: 'reflection',
      });
    }
  }

  for (const exercise of exercises) {
    await supabaseAdmin.from('philosophy_exercises').insert(exercise);
  }
}
```

---

## 3.2. `engine.ts`

Implement philosophy exercise engine.

```ts
import { supabaseAdmin } from '@/lib/supabase';
import { callAI } from '@/lib/ai/call';

async function resolveUserId(clerkId: string): Promise<string> {
  const { data: userRow } = await supabaseAdmin
    .from("users")
    .select("id")
    .eq("clerk_id", clerkId)
    .maybeSingle();

  return userRow?.id || clerkId;
}

export async function assignNextPhilosophyExercise(
  userId: string,
  schoolKey: string,
): Promise<{ exerciseId: string; prompt: string; lessonTitle: string } | null> {
  const dbUserId = await resolveUserId(userId);

  // Find completed exercises
  const { data: completed } = await supabaseAdmin
    .from('user_philosophy_progress')
    .select('exercise_id')
    .eq('user_id', dbUserId)
    .eq('school_key', schoolKey)
    .eq('status', 'completed');

  const completedIds = (completed || []).map((c) => c.exercise_id).filter(Boolean);

  // Find next uncompleted exercise
  const { data: exercise } = await supabaseAdmin
    .from('philosophy_exercises')
    .select(`
      *,
      philosophy_lessons!inner (id, title, school_key)
    `)
    .eq('philosophy_lessons.school_key', schoolKey)
    .not('id', 'in', `(${completedIds.length > 0 ? completedIds.join(',') : 'null'})`)
    .limit(1)
    .maybeSingle();

  if (!exercise) {
    return null;
  }

  const lesson = exercise.philosophy_lessons;

  // Create progress entry
  const { data: progress } = await supabaseAdmin
    .from('user_philosophy_progress')
    .insert({
      user_id: dbUserId,
      school_key: schoolKey,
      lesson_id: lesson.id,
      exercise_id: exercise.id,
      status: 'assigned',
    })
    .select('id')
    .single();

  return {
    exerciseId: progress.id,
    prompt: exercise.prompt_md,
    lessonTitle: lesson.title,
  };
}

export async function submitPhilosophyResponse(
  progressId: string,
  responseText: string,
): Promise<{ score: number; feedback: string }> {
  // Load progress and exercise
  const { data: progress } = await supabaseAdmin
    .from('user_philosophy_progress')
    .select(`
      *,
      philosophy_exercises!inner (*),
      philosophy_lessons!inner (*)
    `)
    .eq('id', progressId)
    .single();

  if (!progress) {
    throw new Error('Progress entry not found');
  }

  const exercise = progress.philosophy_exercises;
  const lesson = progress.philosophy_lessons;

  // Evaluate with LLM
  const systemPrompt = `You are a philosophy coach evaluating a student's response to an exercise. Provide:
1. A score (1-5, where 5 is excellent understanding and application)
2. Constructive feedback that helps the student deepen their practice

Be encouraging but honest.`;

  const userPrompt = `Lesson: ${lesson.title}
Exercise: ${exercise.prompt_md}

Student Response:
${responseText}

Evaluate the response and provide a score (1-5) and feedback.`;

  const result = await callAI({
    userId: 'system',
    model: 'gpt-4o-mini',
    systemPrompt,
    userPrompt,
    temperature: 0.5,
    maxTokens: 300,
    feature: 'philosophy_evaluation',
  });

  const feedback = result.success && result.content
    ? result.content
    : 'Thank you for your response. Keep practicing.';

  // Extract score (look for 1-5)
  const scoreMatch = feedback.match(/\b([1-5])\b/);
  const score = scoreMatch ? parseInt(scoreMatch[1], 10) : 3;

  // Update progress
  await supabaseAdmin
    .from('user_philosophy_progress')
    .update({
      response: responseText,
      status: 'completed',
      score,
      feedback,
      completed_at: new Date().toISOString(),
    })
    .eq('id', progressId);

  return { score, feedback };
}
```

---

## 3.3. AGI Integration: PhilosophyCoachAgent

Create AGI agent: `lib/agi/agents/philosophyCoachAgent.ts`

```ts
import { Agent, makeAgentResult } from '../agents';
import { AgentContext, AGIAction } from '../types';

export const philosophyCoachAgent: Agent = {
  name: 'PhilosophyCoachAgent',
  description: 'Suggests philosophy exercises based on emotional state, stress, and upcoming events.',
  domains: ['emotion', 'identity', 'personal_growth'],
  priority: 75,
  defaultAggressiveness: 'balanced',

  async run(ctx: AgentContext) {
    const actions: AGIAction[] = [];
    const world: any = ctx.world;

    const emotionState = world.emotion?.currentState?.toLowerCase() || '';
    const stressLevel = world.emotion?.currentStress || 0.5;
    const upcomingEvents = world.time?.upcomingEvents || [];
    const overdueTasks = world.time?.overdueTasks || [];

    // High stress + many overdue tasks → Stoic control exercise
    if (stressLevel > 0.7 && overdueTasks.length > 3) {
      actions.push({
        type: 'nudge_user',
        label: 'Practice Stoic control exercise',
        details: {
          message: `You're dealing with high stress and many overdue tasks. A 5-minute Stoic exercise on "Dichotomy of Control" could help you focus on what you can actually control.`,
          domain: 'philosophy',
          subsource: 'philosophy_coach_agent',
          metadata: {
            schoolKey: 'stoicism',
            lessonKey: 'dichotomy_of_control',
          },
        },
        requiresConfirmation: false,
        riskLevel: 'low',
      });
    }

    // Major presentation/meeting coming up → Samurai presence exercise
    const majorEvents = upcomingEvents.filter((e: any) => {
      const title = (e.title || '').toLowerCase();
      return title.includes('presentation') || title.includes('meeting') || title.includes('pitch');
    });

    if (majorEvents.length > 0) {
      actions.push({
        type: 'nudge_user',
        label: 'Samurai presence drill before your event',
        details: {
          message: `You have ${majorEvents.length} important event(s) coming up. A Samurai-style presence exercise could help you approach it with composure and focus.`,
          domain: 'philosophy',
          subsource: 'philosophy_coach_agent',
          metadata: {
            schoolKey: 'samurai',
            lessonKey: 'musashi_distance',
          },
        },
        requiresConfirmation: false,
        riskLevel: 'low',
      });
    }

    // Emotional overwhelm → View from above
    if (emotionState.includes('overwhelmed') || emotionState.includes('anxious')) {
      actions.push({
        type: 'nudge_user',
        label: 'Stoic "View from Above" meditation',
        details: {
          message: 'When feeling overwhelmed, the Stoic "View from Above" meditation can help you gain perspective and reduce anxiety.',
          domain: 'philosophy',
          subsource: 'philosophy_coach_agent',
          metadata: {
            schoolKey: 'stoicism',
            lessonKey: 'view_from_above',
          },
        },
        requiresConfirmation: false,
        riskLevel: 'low',
      });
    }

    const reasoning = `Analyzed emotional state (stress: ${stressLevel.toFixed(2)}) and upcoming events. Proposed ${actions.length} philosophy exercise(s).`;

    return makeAgentResult('PhilosophyCoachAgent', reasoning, actions, 0.7);
  },
};
```

---

# SECTION 4 — API LAYER

## 4.1. Communication Roleplay API

`app/api/communication/roleplay/start/route.ts`:

```ts
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { startRoleplay } from '@/lib/communication/roleplay_engine';

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const body = await req.json();
    const { programKey, context } = body;

    if (!programKey) {
      return NextResponse.json({ error: 'programKey is required' }, { status: 400 });
    }

    const result = await startRoleplay(userId, programKey, context || {});

    return NextResponse.json(result);
  } catch (err: any) {
    console.error('[API][Communication] Start roleplay error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
```

`app/api/communication/roleplay/turn/route.ts`:

```ts
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { continueRoleplay } from '@/lib/communication/roleplay_engine';

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const body = await req.json();
    const { sessionId, userMessage } = body;

    if (!sessionId || !userMessage) {
      return NextResponse.json({ error: 'sessionId and userMessage are required' }, { status: 400 });
    }

    const result = await continueRoleplay(sessionId, userId, userMessage);

    return NextResponse.json(result);
  } catch (err: any) {
    console.error('[API][Communication] Roleplay turn error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
```

---

## 4.2. Communication Analysis API

`app/api/communication/analyze-call/route.ts`:

```ts
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { analyzeCallCommunication } from '@/lib/communication/analysis_engine';

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const body = await req.json();
    const { callId, programKey } = body;

    if (!callId) {
      return NextResponse.json({ error: 'callId is required' }, { status: 400 });
    }

    const result = await analyzeCallCommunication(userId, callId, programKey);

    return NextResponse.json(result);
  } catch (err: any) {
    console.error('[API][Communication] Analyze call error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
```

---

## 4.3. Philosophy Dojo API

`app/api/philosophy/next/route.ts`:

```ts
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { assignNextPhilosophyExercise } from '@/lib/philosophy/dojo_v3/engine';

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const body = await req.json();
    const { schoolKey } = body;

    if (!schoolKey) {
      return NextResponse.json({ error: 'schoolKey is required' }, { status: 400 });
    }

    const result = await assignNextPhilosophyExercise(userId, schoolKey);

    if (!result) {
      return NextResponse.json({ error: 'No more exercises available' }, { status: 404 });
    }

    return NextResponse.json(result);
  } catch (err: any) {
    console.error('[API][Philosophy] Next exercise error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
```

`app/api/philosophy/submit/route.ts`:

```ts
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { submitPhilosophyResponse } from '@/lib/philosophy/dojo_v3/engine';

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const body = await req.json();
    const { progressId, response } = body;

    if (!progressId || !response) {
      return NextResponse.json({ error: 'progressId and response are required' }, { status: 400 });
    }

    const result = await submitPhilosophyResponse(progressId, response);

    return NextResponse.json(result);
  } catch (err: any) {
    console.error('[API][Philosophy] Submit error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
```

---

# SECTION 5 — UI INTEGRATION

## 5.1. Communication Mastery UI

Create: `app/(authenticated)/communication/dashboard/page.tsx`

```tsx
'use client';

import { useState, useEffect } from 'react';
import { useUser } from '@clerk/nextjs';
import { AppCard } from '@/components/ui/AppCard';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';

export default function CommunicationDashboardPage() {
  const { user } = useUser();
  const router = useRouter();
  const [programs, setPrograms] = useState<any[]>([]);
  const [sessions, setSessions] = useState<any[]>([]);

  useEffect(() => {
    fetchPrograms();
    fetchSessions();
  }, []);

  async function fetchPrograms() {
    const res = await fetch('/api/communication/programs');
    if (res.ok) {
      const data = await res.json();
      setPrograms(data);
    }
  }

  async function fetchSessions() {
    const res = await fetch('/api/communication/sessions');
    if (res.ok) {
      const data = await res.json();
      setSessions(data);
    }
  }

  async function startRoleplay(programKey: string) {
    const res = await fetch('/api/communication/roleplay/start', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ programKey }),
    });

    if (res.ok) {
      const { sessionId } = await res.json();
      router.push(`/communication/roleplay/${sessionId}`);
    }
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <h1 className="text-2xl font-bold text-white">Communication Mastery</h1>

      <AppCard className="p-6">
        <h2 className="text-xl font-semibold text-white mb-4">Training Programs</h2>
        <div className="space-y-4">
          {programs.map((program) => (
            <div key={program.key} className="p-4 bg-black/30 rounded">
              <h3 className="text-white font-medium">{program.name}</h3>
              <p className="text-white/60 text-sm mb-2">{program.description}</p>
              <Button onClick={() => startRoleplay(program.key)} size="sm">
                Start Roleplay
              </Button>
            </div>
          ))}
        </div>
      </AppCard>

      <AppCard className="p-6">
        <h2 className="text-xl font-semibold text-white mb-4">Recent Sessions</h2>
        <div className="space-y-2">
          {sessions.length === 0 ? (
            <p className="text-white/60">No sessions yet.</p>
          ) : (
            sessions.map((session) => (
              <div key={session.id} className="p-3 bg-black/30 rounded">
                <div className="flex justify-between">
                  <span className="text-white">{session.program_key}</span>
                  {session.score && (
                    <span className="text-white/60">Score: {session.score}</span>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </AppCard>
    </div>
  );
}
```

---

## 5.2. Philosophy Dojo UI

Create: `app/(authenticated)/dojo/page.tsx`

```tsx
'use client';

import { useState, useEffect } from 'react';
import { AppCard } from '@/components/ui/AppCard';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';

export default function PhilosophyDojoPage() {
  const router = useRouter();
  const [schools, setSchools] = useState<any[]>([]);

  useEffect(() => {
    fetchSchools();
  }, []);

  async function fetchSchools() {
    // TODO: Implement API endpoint
    setSchools([
      { key: 'stoicism', name: 'Stoicism', description: 'Ancient wisdom for modern life' },
      { key: 'samurai', name: 'Samurai / Bushidō', description: 'The way of the warrior' },
    ]);
  }

  function startSchool(schoolKey: string) {
    router.push(`/dojo/${schoolKey}/session`);
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <h1 className="text-2xl font-bold text-white">Philosophy Dojo</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {schools.map((school) => (
          <AppCard key={school.key} className="p-6">
            <h2 className="text-xl font-semibold text-white mb-2">{school.name}</h2>
            <p className="text-white/60 mb-4">{school.description}</p>
            <Button onClick={() => startSchool(school.key)}>Start Practice</Button>
          </AppCard>
        ))}
      </div>
    </div>
  );
}
```

---

## 5.3. Voice OS Integration

Update `lib/voice/intent_detector.ts`:

```ts
// Add to detectVoiceIntent function
if (
  lowerText.includes('practice') ||
  lowerText.includes('roleplay') ||
  lowerText.includes('train communication')
) {
  return {
    route: 'communication_training',
    programKey: extractProgramKey(text), // heuristic
  };
}

if (
  lowerText.includes('stoic') ||
  lowerText.includes('samurai') ||
  lowerText.includes('philosophy') ||
  lowerText.includes('drill')
) {
  return {
    route: 'philosophy_training',
    schoolKey: extractSchoolKey(text), // heuristic
  };
}
```

Add routes: `lib/voice/routes/communication_training.ts` and `lib/voice/routes/philosophy_training.ts`

---

# SECTION 6 — AGI & EVALUATION INTEGRATION

## 6.1. CommunicationCoachAgent

Create: `lib/agi/agents/communicationCoachAgent.ts`

```ts
import { Agent, makeAgentResult } from '../agents';
import { AgentContext, AGIAction } from '../types';

export const communicationCoachAgent: Agent = {
  name: 'CommunicationCoachAgent',
  description: 'Suggests communication training based on calls, relationships, and job context.',
  domains: ['work', 'relationships'],
  priority: 80,
  defaultAggressiveness: 'balanced',

  async run(ctx: AgentContext) {
    const actions: AGIAction[] = [];
    const world: any = ctx.world;

    // Check for recent high-stakes calls
    const recentCalls = world.work?.recentCalls || [];
    const highStakesCalls = recentCalls.filter((c: any) => c.importance === 'high');

    if (highStakesCalls.length >= 3) {
      actions.push({
        type: 'nudge_user',
        label: 'Practice sales call techniques',
        details: {
          message: `You've had ${highStakesCalls.length} high-stakes calls recently. Consider a 10-minute roleplay to refine your approach.`,
          domain: 'communication',
          subsource: 'communication_coach_agent',
          metadata: {
            programKey: 'sales_calls',
          },
        },
        requiresConfirmation: false,
        riskLevel: 'low',
      });
    }

    // Check for overdue difficult conversations
    const overdueDifficult = world.relationships?.overdueDifficultConversations || [];
    if (overdueDifficult.length > 0) {
      actions.push({
        type: 'nudge_user',
        label: 'Practice difficult conversations',
        details: {
          message: `You have ${overdueDifficult.length} difficult conversation(s) coming up. A roleplay session could help you prepare.`,
          domain: 'communication',
          subsource: 'communication_coach_agent',
          metadata: {
            programKey: 'difficult_conversations',
          },
        },
        requiresConfirmation: false,
        riskLevel: 'low',
      });
    }

    const reasoning = `Analyzed communication patterns. Found ${highStakesCalls.length} high-stakes calls and ${overdueDifficult.length} difficult conversations.`;

    return makeAgentResult('CommunicationCoachAgent', reasoning, actions, 0.7);
  },
};
```

---

## 6.2. AGI Planner Integration

Update `lib/agi/planner.ts`:

```ts
// Add scoring factor for communication/philosophy actions
if (action.details?.domain === 'communication' || action.details?.domain === 'philosophy') {
  score += 0.05; // Slight boost for training actions
}
```

---

# SECTION 7 — ACCEPTANCE CRITERIA

Phase 14 is **complete** when:

### ✅ Communication Mastery

1. User can:
   * Go to `/communication/dashboard`
   * Start a roleplay session (e.g., "sales_calls" or "difficult_conversations")
   * Have a multi-turn conversation with a coach persona
   * Receive feedback and a session score

2. From a call detail:
   * Click "Analyze my communication on this call"
   * Get a scored rubric + suggestions

3. CommunicationCoachAgent:
   * Proposes at least one **training-related AGI action** in `AGICommandCenter` based on real user signals.

### ✅ Philosophy Dojo v3

1. User can:
   * Visit `/dojo`
   * Choose Stoicism or Samurai
   * Receive a specific exercise
   * Submit a response
   * Receive feedback + score
   * See progress over time

2. PhilosophyCoachAgent:
   * Suggests exercises based on:
     * Emotional state
     * Overwhelm/executive function stress
     * Upcoming events

### ✅ Voice Integration

1. User can say:
   * "Help me practice this conversation" → roleplay kicks off.
   * "Give me a Stoic drill for today" → Dojo exercise kicks off.

2. All dialogs are logged into the appropriate session tables and visible in UI.

### ✅ AGI & Growth

* AGI planner includes communication/philosophy actions among its proposals.

* Telemetry shows usage of:
  * communication sessions
  * philosophy exercises

* You can see, for a test user, **increasing scores** over multiple sessions.

---

**End of spec.**


