# 🧠 PULSE OS — PHASE 17 MEGA SPEC

## Self-Optimization Engine & Experiment Lab

> **You are:** Senior Staff Engineer on Pulse OS (Next.js 16 + Supabase + TypeScript).

> **Goal:**

> Build the **Self-Optimization Engine & Experiment Lab**:

>
> * Pulse can propose and run **structured experiments** in a user's life

> * Measure results using existing metrics (emotion, productivity, finances, communication, etc.)

> * Learn "what works for THIS human" and personalize future plans

> * Provide a **visible lab UI** where the user can see experiments, results, and insights

Phases 1–16 are assumed to be in place:

* AGI Kernel + WorldState + multi-agent mesh

* Vertical job packs & Civilization Layer (leagues, tiers, metrics)

* Household / org / team AGI

* Voice OS, mobile, call intelligence

* Communication Mastery & Philosophy Dojo

* Financial Brain

* Onboarding, teaching system, scenarios, telemetry

---

## 0. DESIGN PRINCIPLES

1. **Experiment, don't guess**: Pulse should stop making static "advice" and start proposing **time-bound experiments** with clear hypotheses and metrics.

2. **Metrics across modules**: Use what's already there:
   * Emotion OS (stress/hype trends)
   * Executive Function (overwhelm, completion rate)
   * Calendar & Routines
   * Communication scores
   * Financial Brain (stress-spend, bill timeliness)
   * Civilization / vertical metrics

3. **Tiny, safe experiments by default**: No extreme health, diet, or financial risk moves. Focus on behaviors, routines, focus patterns, communication, work habits, planning.

4. **User-in-the-loop**: User always chooses which areas to experiment in, intensity levels, and whether to accept new experimental proposals.

---

# SECTION 1 — DATABASE LAYER

Create migrations in `/supabase/migrations/`.

## 1.1. Experiment Templates & Metrics

Migration: `20260110_experiment_lab_v1.sql`

```sql
-- ============================================
-- EXPERIMENT LAB V1
-- Templates, user experiments, metrics
-- ============================================

create table if not exists public.experiment_templates (
  id uuid primary key default gen_random_uuid(),
  key text not null,                   -- 'deep_work_morning_block', 'weekly_review', etc.
  name text not null,
  description text,

  -- High-level domain: 'focus', 'workflows', 'communication', 'finance', 'relationships', 'wellbeing'
  domain text not null,

  -- JSON schema describing metrics & interventions
  config jsonb not null default '{}'::jsonb,

  created_at timestamptz not null default now()
);

create unique index if not exists experiment_templates_key_unique
  on public.experiment_templates(key);

create table if not exists public.experiment_metrics (
  id uuid primary key default gen_random_uuid(),
  key text not null,                   -- 'daily_focus_score', 'tasks_completed', 'calendar_overload', etc.
  name text not null,
  description text,
  -- Source module hints: 'emotion', 'calendar', 'tasks', 'communication', 'finance', 'civilization'
  source_module text not null,

  created_at timestamptz not null default now()
);

create unique index if not exists experiment_metrics_key_unique
  on public.experiment_metrics(key);
```

---

## 1.2. User Experiments & Arms

```sql
create table if not exists public.user_experiments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  template_key text not null,          -- fk to experiment_templates.key

  name text not null,                  -- user-friendly name
  domain text not null,                -- copy from template or override

  status text not null default 'planned', -- 'planned', 'running', 'completed', 'cancelled'

  -- When the experiment actually runs
  start_date date,
  end_date date,

  -- Hypothesis, user-visible: "If I do X, Y will improve"
  hypothesis text,
  notes text,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists user_experiments_user_idx
  on public.user_experiments(user_id);

create index if not exists user_experiments_status_idx
  on public.user_experiments(status);

create table if not exists public.user_experiment_arms (
  id uuid primary key default gen_random_uuid(),
  experiment_id uuid not null references public.user_experiments(id) on delete cascade,

  key text not null,                   -- 'baseline', 'variant_a', 'variant_b'
  description text,

  -- JSON describing behaviors/rules:
  -- e.g. { "calendar_blocks": [...], "daily_reflection": true }
  intervention jsonb not null default '{}'::jsonb,

  created_at timestamptz not null default now()
);

create index if not exists user_experiment_arms_experiment_idx
  on public.user_experiment_arms(experiment_id);
```

---

## 1.3. Data Points & Results

```sql
create table if not exists public.user_experiment_data_points (
  id uuid primary key default gen_random_uuid(),
  experiment_id uuid not null references public.user_experiments(id) on delete cascade,
  arm_id uuid references public.user_experiment_arms(id),

  -- When this datapoint was collected
  observed_at date not null,

  metric_key text not null,           -- fk to experiment_metrics.key (logical)
  value numeric not null,
  metadata jsonb not null default '{}'::jsonb,

  created_at timestamptz not null default now()
);

create index if not exists user_experiment_data_points_experiment_idx
  on public.user_experiment_data_points(experiment_id);

create index if not exists user_experiment_data_points_metric_idx
  on public.user_experiment_data_points(metric_key);

create table if not exists public.user_experiment_results (
  id uuid primary key default gen_random_uuid(),
  experiment_id uuid not null references public.user_experiments(id) on delete cascade,

  -- JSON summarizing effect size / insights per metric
  summary jsonb not null,

  created_at timestamptz not null default now()
);

create unique index if not exists user_experiment_results_experiment_unique
  on public.user_experiment_results(experiment_id);
```

---

# SECTION 2 — EXPERIMENT ENGINE MODULES

Create directory: `/lib/experiments/`.

## 2.1. Template Engine

`/lib/experiments/templates.ts`

```ts
import { supabaseAdmin } from '@/lib/supabase';

export interface ExperimentTemplateConfig {
  suggestedDurationDays: number;        // e.g., 14 or 21
  recommendedMetrics: string[];         // metric_keys
  defaultHypothesis: string;            // natural language
  defaultIntervention: any;             // JSON payload describing what to change
}

export interface ExperimentTemplate {
  id: string;
  key: string;
  name: string;
  description: string;
  domain: string;
  config: ExperimentTemplateConfig;
}

export async function seedExperimentTemplates(): Promise<void> {
  const templates = [
    {
      key: 'deep_work_morning_block',
      name: 'Morning Deep Work Block',
      description: 'Block 2-3 hours each morning for focused, uninterrupted work',
      domain: 'focus',
      config: {
        suggestedDurationDays: 14,
        recommendedMetrics: ['daily_focus_score', 'task_completion_rate', 'daily_stress_index'],
        defaultHypothesis: 'If I block morning hours for deep work, my focus and task completion will improve while reducing afternoon stress.',
        defaultIntervention: {
          calendar_blocks: [
            {
              start_time: '09:00',
              end_time: '12:00',
              days: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'],
              label: 'Deep Work',
              protect: true,
            },
          ],
        },
      },
    },
    {
      key: 'evening_shutdown_ritual',
      name: 'Evening Shutdown Ritual',
      description: 'End each workday with a 15-minute shutdown ritual: review, plan tomorrow, close loops',
      domain: 'workflows',
      config: {
        suggestedDurationDays: 21,
        recommendedMetrics: ['daily_stress_index', 'task_completion_rate', 'calendar_overload_score'],
        defaultHypothesis: 'If I do a daily shutdown ritual, I will reduce work anxiety and improve next-day planning.',
        defaultIntervention: {
          daily_task: {
            title: 'Evening Shutdown',
            time: '17:00',
            checklist: [
              'Review today\'s accomplishments',
              'Plan top 3 for tomorrow',
              'Close all open loops',
              'Clear workspace',
            ],
          },
        },
      },
    },
    {
      key: 'weekly_planning_plus_review',
      name: 'Weekly Planning + Review',
      description: 'Dedicate Sunday to weekly review and Monday planning',
      domain: 'workflows',
      config: {
        suggestedDurationDays: 28,
        recommendedMetrics: ['task_completion_rate', 'calendar_overload_score', 'daily_focus_score'],
        defaultHypothesis: 'If I do structured weekly planning and review, I will improve execution and reduce overwhelm.',
        defaultIntervention: {
          weekly_ritual: {
            day: 'sunday',
            time: '16:00',
            duration_minutes: 60,
            activities: ['review_week', 'plan_next_week', 'set_priorities'],
          },
        },
      },
    },
    {
      key: 'pre_call_warmup',
      name: 'Pre-Call Communication Warmup',
      description: 'Do a 5-minute communication drill before important calls',
      domain: 'communication',
      config: {
        suggestedDurationDays: 14,
        recommendedMetrics: ['communication_quality_score', 'daily_stress_index'],
        defaultHypothesis: 'If I warm up with communication drills before calls, my call quality and confidence will improve.',
        defaultIntervention: {
          trigger: 'before_important_call',
          activity: {
            type: 'communication_drill',
            duration_minutes: 5,
            focus: 'clarity_and_listening',
          },
        },
      },
    },
    {
      key: 'finance_weekly_money_checkin',
      name: 'Weekly Money Check-in',
      description: 'Spend 15 minutes each week reviewing finances and budget status',
      domain: 'finance',
      config: {
        suggestedDurationDays: 21,
        recommendedMetrics: ['financial_clarity_score', 'daily_stress_index'],
        defaultHypothesis: 'If I do weekly financial check-ins, I will reduce money anxiety and improve financial clarity.',
        defaultIntervention: {
          weekly_task: {
            day: 'sunday',
            time: '10:00',
            duration_minutes: 15,
            activities: ['review_budget', 'check_bills', 'update_snapshot'],
          },
        },
      },
    },
    {
      key: 'relationship_weekly_sync',
      name: 'Weekly Relationship Sync',
      description: 'Dedicate 30 minutes weekly to sync with partner/household',
      domain: 'relationships',
      config: {
        suggestedDurationDays: 28,
        recommendedMetrics: ['household_harmony_proxy', 'daily_stress_index'],
        defaultHypothesis: 'If we do weekly relationship syncs, household coordination and harmony will improve.',
        defaultIntervention: {
          weekly_meeting: {
            day: 'sunday',
            time: '18:00',
            duration_minutes: 30,
            participants: 'household',
            agenda: ['calendar_sync', 'shared_goals', 'check_ins'],
          },
        },
      },
    },
  ];

  for (const template of templates) {
    await supabaseAdmin
      .from('experiment_templates')
      .upsert(template, { onConflict: 'key' });
  }
}

export async function getExperimentTemplateByKey(key: string): Promise<ExperimentTemplate | null> {
  const { data, error } = await supabaseAdmin
    .from('experiment_templates')
    .select('*')
    .eq('key', key)
    .maybeSingle();

  if (error) {
    console.error('[Experiments] Failed to load template', error);
    return null;
  }

  if (!data) return null;

  return {
    id: data.id,
    key: data.key,
    name: data.name,
    description: data.description,
    domain: data.domain,
    config: data.config as ExperimentTemplateConfig,
  };
}

export async function listExperimentTemplatesByDomain(
  domain: string,
): Promise<ExperimentTemplate[]> {
  const { data, error } = await supabaseAdmin
    .from('experiment_templates')
    .select('*')
    .eq('domain', domain);

  if (error) {
    console.error('[Experiments] Failed to load templates', error);
    return [];
  }

  return (data || []).map((row) => ({
    id: row.id,
    key: row.key,
    name: row.name,
    description: row.description,
    domain: row.domain,
    config: row.config as ExperimentTemplateConfig,
  }));
}
```

---

## 2.2. Experiment Lifecycle Service

`/lib/experiments/service.ts`

```ts
import { supabaseAdmin } from '@/lib/supabase';
import { getExperimentTemplateByKey } from './templates';

async function resolveUserId(clerkId: string): Promise<string> {
  const { data: userRow } = await supabaseAdmin
    .from("users")
    .select("id")
    .eq("clerk_id", clerkId)
    .maybeSingle();

  return userRow?.id || clerkId;
}

export interface UserExperiment {
  id: string;
  user_id: string;
  template_key: string;
  name: string;
  domain: string;
  status: 'planned' | 'running' | 'completed' | 'cancelled';
  start_date?: string;
  end_date?: string;
  hypothesis?: string;
  notes?: string;
}

export async function createUserExperiment(
  userId: string,
  templateKey: string,
  overrides?: Partial<UserExperiment>,
): Promise<string> {
  const dbUserId = await resolveUserId(userId);

  const template = await getExperimentTemplateByKey(templateKey);
  if (!template) {
    throw new Error('Template not found');
  }

  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const endDate = new Date(tomorrow);
  endDate.setDate(endDate.getDate() + template.config.suggestedDurationDays);

  const { data: experiment, error: expError } = await supabaseAdmin
    .from('user_experiments')
    .insert({
      user_id: dbUserId,
      template_key: templateKey,
      name: overrides?.name || template.name,
      domain: template.domain,
      status: 'planned',
      start_date: overrides?.start_date || tomorrow.toISOString().split('T')[0],
      end_date: overrides?.end_date || endDate.toISOString().split('T')[0],
      hypothesis: overrides?.hypothesis || template.config.defaultHypothesis,
      notes: overrides?.notes || null,
    })
    .select('id')
    .single();

  if (expError || !experiment) {
    throw new Error('Failed to create experiment');
  }

  // Create arms
  await supabaseAdmin.from('user_experiment_arms').insert([
    {
      experiment_id: experiment.id,
      key: 'baseline',
      description: 'Baseline behavior (no intervention)',
      intervention: {},
    },
    {
      experiment_id: experiment.id,
      key: 'variant_a',
      description: 'With intervention',
      intervention: template.config.defaultIntervention,
    },
  ]);

  return experiment.id;
}

export async function startExperiment(
  experimentId: string,
  startDate?: string,
): Promise<void> {
  const actualStartDate = startDate || new Date().toISOString().split('T')[0];

  const { error } = await supabaseAdmin
    .from('user_experiments')
    .update({
      status: 'running',
      start_date: actualStartDate,
      updated_at: new Date().toISOString(),
    })
    .eq('id', experimentId);

  if (error) {
    throw new Error('Failed to start experiment');
  }

  // TODO: Schedule AGI/autopilot tasks based on intervention
  // This would create calendar blocks, tasks, etc. based on the intervention JSON
}

export async function completeExperiment(
  experimentId: string,
  endDate?: string,
): Promise<void> {
  const actualEndDate = endDate || new Date().toISOString().split('T')[0];

  const { error } = await supabaseAdmin
    .from('user_experiments')
    .update({
      status: 'completed',
      end_date: actualEndDate,
      updated_at: new Date().toISOString(),
    })
    .eq('id', experimentId);

  if (error) {
    throw new Error('Failed to complete experiment');
  }

  // Trigger result computation (async)
  // This would be called separately via API or queue
}

export async function cancelExperiment(experimentId: string): Promise<void> {
  const { error } = await supabaseAdmin
    .from('user_experiments')
    .update({
      status: 'cancelled',
      updated_at: new Date().toISOString(),
    })
    .eq('id', experimentId);

  if (error) {
    throw new Error('Failed to cancel experiment');
  }
}
```

---

## 2.3. Metric Collection Orchestrator

`/lib/experiments/metrics_collector.ts`

```ts
import { supabaseAdmin } from '@/lib/supabase';
import { buildWorldState } from '@/lib/agi/worldstate';
import { computeSnapshot } from '@/lib/finance/brain/ledger';

async function resolveUserId(clerkId: string): Promise<string> {
  const { data: userRow } = await supabaseAdmin
    .from("users")
    .select("id")
    .eq("clerk_id", clerkId)
    .maybeSingle();

  return userRow?.id || clerkId;
}

export async function collectDailyMetricsForExperiment(
  experimentId: string,
  date: string,
): Promise<void> {
  // Get experiment
  const { data: experiment } = await supabaseAdmin
    .from('user_experiments')
    .select('user_id, template_key, start_date, end_date')
    .eq('id', experimentId)
    .single();

  if (!experiment) {
    throw new Error('Experiment not found');
  }

  // Get template to know which metrics to collect
  const { data: template } = await supabaseAdmin
    .from('experiment_templates')
    .select('config')
    .eq('key', experiment.template_key)
    .single();

  if (!template) {
    throw new Error('Template not found');
  }

  const config = template.config as any;
  const metricKeys = config.recommendedMetrics || [];

  // Get user's clerk_id
  const { data: user } = await supabaseAdmin
    .from('users')
    .select('clerk_id')
    .eq('id', experiment.user_id)
    .single();

  if (!user) {
    throw new Error('User not found');
  }

  // Build world state for this date (approximate)
  const world = await buildWorldState(user.clerk_id);

  // Determine which arm is active (simplified: if date is after start, use variant_a)
  const experimentStart = new Date(experiment.start_date);
  const observationDate = new Date(date);
  const isBaseline = observationDate < experimentStart;

  const { data: arms } = await supabaseAdmin
    .from('user_experiment_arms')
    .select('id, key')
    .eq('experiment_id', experimentId);

  const baselineArm = arms?.find((a) => a.key === 'baseline');
  const variantArm = arms?.find((a) => a.key === 'variant_a');
  const activeArmId = isBaseline ? baselineArm?.id : variantArm?.id;

  // Collect metrics
  const dataPoints: any[] = [];

  for (const metricKey of metricKeys) {
    let value: number | null = null;

    switch (metricKey) {
      case 'daily_focus_score': {
        // From executive function / tasks
        const completedTasks = world.time?.todayTasks?.filter((t: any) => t.status === 'completed').length || 0;
        const totalTasks = world.time?.todayTasks?.length || 0;
        value = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 50;
        break;
      }

      case 'daily_stress_index': {
        // From emotion OS
        value = (world.emotion?.currentStress || 0.5) * 100;
        break;
      }

      case 'task_completion_rate': {
        const completed = world.time?.todayTasks?.filter((t: any) => t.status === 'completed').length || 0;
        const total = world.time?.todayTasks?.length || 0;
        value = total > 0 ? (completed / total) * 100 : 50;
        break;
      }

      case 'calendar_overload_score': {
        // From calendar perception
        const overload = world.time?.dayFeatures?.overload ? 80 : 20;
        value = overload;
        break;
      }

      case 'communication_quality_score': {
        // Placeholder: would come from communication mastery engine
        value = 50; // Default
        break;
      }

      case 'financial_clarity_score': {
        // From financial brain
        try {
          // This would need entity lookup - simplified for now
          value = 50; // Default
        } catch {
          value = 50;
        }
        break;
      }

      case 'household_harmony_proxy': {
        // From household AGI
        const householdLoad = world.households?.[0]?.stressSignals?.householdLoad || 0.5;
        value = (1 - householdLoad) * 100; // Invert: lower stress = higher harmony
        break;
      }

      default:
        value = null;
    }

    if (value !== null) {
      dataPoints.push({
        experiment_id: experimentId,
        arm_id: activeArmId || null,
        observed_at: date,
        metric_key: metricKey,
        value,
        metadata: {},
      });
    }
  }

  // Insert data points
  if (dataPoints.length > 0) {
    const { error } = await supabaseAdmin.from('user_experiment_data_points').insert(dataPoints);
    if (error) {
      console.error('[Experiments] Failed to insert data points', error);
    }
  }
}
```

---

## 2.4. Result Analysis Engine

`/lib/experiments/analysis.ts`

```ts
import { supabaseAdmin } from '@/lib/supabase';
import { callAI } from '@/lib/ai/call';

export interface ExperimentResultSummary {
  metrics: {
    [metricKey: string]: {
      baselineAvg: number | null;
      variantAvg: number | null;
      delta: number | null;
      interpretation: string;
    };
  };
  overallNarrative: string;
  recommendation: 'adopt' | 'reject' | 'inconclusive';
}

export async function computeExperimentResults(
  experimentId: string,
): Promise<ExperimentResultSummary> {
  // Get experiment
  const { data: experiment } = await supabaseAdmin
    .from('user_experiments')
    .select('user_id, template_key, start_date, hypothesis')
    .eq('id', experimentId)
    .single();

  if (!experiment) {
    throw new Error('Experiment not found');
  }

  // Get arms
  const { data: arms } = await supabaseAdmin
    .from('user_experiment_arms')
    .select('id, key')
    .eq('experiment_id', experimentId);

  const baselineArm = arms?.find((a) => a.key === 'baseline');
  const variantArm = arms?.find((a) => a.key === 'variant_a');

  if (!baselineArm || !variantArm) {
    throw new Error('Arms not found');
  }

  // Get data points
  const { data: dataPoints } = await supabaseAdmin
    .from('user_experiment_data_points')
    .select('*')
    .eq('experiment_id', experimentId);

  // Group by arm and metric
  const baselineData: Record<string, number[]> = {};
  const variantData: Record<string, number[]> = {};

  (dataPoints || []).forEach((dp: any) => {
    const metricKey = dp.metric_key;
    if (dp.arm_id === baselineArm.id) {
      if (!baselineData[metricKey]) baselineData[metricKey] = [];
      baselineData[metricKey].push(dp.value);
    } else if (dp.arm_id === variantArm.id) {
      if (!variantData[metricKey]) variantData[metricKey] = [];
      variantData[metricKey].push(dp.value);
    }
  });

  // Compute averages and deltas
  const metrics: ExperimentResultSummary['metrics'] = {};

  const allMetricKeys = new Set([
    ...Object.keys(baselineData),
    ...Object.keys(variantData),
  ]);

  for (const metricKey of allMetricKeys) {
    const baselineValues = baselineData[metricKey] || [];
    const variantValues = variantData[metricKey] || [];

    const baselineAvg =
      baselineValues.length > 0
        ? baselineValues.reduce((a, b) => a + b, 0) / baselineValues.length
        : null;
    const variantAvg =
      variantValues.length > 0
        ? variantValues.reduce((a, b) => a + b, 0) / variantValues.length
        : null;

    const delta = baselineAvg !== null && variantAvg !== null ? variantAvg - baselineAvg : null;

    metrics[metricKey] = {
      baselineAvg,
      variantAvg,
      delta,
      interpretation: '', // Will be filled by LLM
    };
  }

  // Use LLM to generate narrative and interpretations
  const systemPrompt = `You are a data analyst summarizing experiment results. Provide clear, actionable insights.`;

  const userPrompt = `Experiment Hypothesis: ${experiment.hypothesis}

Results:
${Object.entries(metrics)
  .map(
    ([key, m]) =>
      `${key}: Baseline avg ${m.baselineAvg?.toFixed(1) || 'N/A'}, Variant avg ${m.variantAvg?.toFixed(1) || 'N/A'}, Delta ${m.delta?.toFixed(1) || 'N/A'}`,
  )
  .join('\n')}

Provide:
1. Interpretation for each metric (1-2 sentences)
2. Overall narrative (2-3 paragraphs)
3. Recommendation: 'adopt', 'reject', or 'inconclusive'

Respond with JSON only.`;

  const result = await callAI({
    userId: 'system',
    model: 'gpt-4o-mini',
    systemPrompt,
    userPrompt,
    temperature: 0.5,
    maxTokens: 800,
    feature: 'experiment_analysis',
  });

  let parsed: any = {};
  if (result.success && result.content) {
    try {
      parsed = JSON.parse(result.content);
    } catch {
      // Fallback
    }
  }

  // Fill in interpretations
  if (parsed.interpretations) {
    for (const [key, interpretation] of Object.entries(parsed.interpretations)) {
      if (metrics[key]) {
        metrics[key].interpretation = interpretation as string;
      }
    }
  }

  const summary: ExperimentResultSummary = {
    metrics,
    overallNarrative:
      parsed.overallNarrative ||
      'Experiment completed. Review the metrics to see the impact of the intervention.',
    recommendation: parsed.recommendation || 'inconclusive',
  };

  // Save to database
  await supabaseAdmin.from('user_experiment_results').upsert(
    {
      experiment_id: experimentId,
      summary,
    },
    { onConflict: 'experiment_id' },
  );

  return summary;
}
```

---

# SECTION 3 — AGI INTEGRATION

## 3.1. WorldState Extension

Update `lib/agi/worldstate.ts`:

```ts
// Add to WorldState interface
export interface WorldState {
  // ... existing fields ...
  optimization?: {
    activeExperiments: {
      id: string;
      name: string;
      domain: string;
      status: string;
      startDate?: string;
      endDate?: string;
    }[];
    recentResults: {
      id: string;
      name: string;
      domain: string;
      recommendation: string;
    }[];
  };
}

// In buildWorldState function, add:
import { supabaseAdmin } from '@/lib/supabase';

// Inside buildWorldState:
const dbUserId = await resolveUserId(userId);

// Get active experiments
const { data: activeExps } = await supabaseAdmin
  .from('user_experiments')
  .select('id, name, domain, status, start_date, end_date')
  .eq('user_id', dbUserId)
  .eq('status', 'running');

// Get recent results
const { data: recentResults } = await supabaseAdmin
  .from('user_experiment_results')
  .select(`
    *,
    user_experiments!inner (id, name, domain)
  `)
  .eq('user_experiments.user_id', dbUserId)
  .order('created_at', { ascending: false })
  .limit(5);

world.optimization = {
  activeExperiments: (activeExps || []).map((e) => ({
    id: e.id,
    name: e.name,
    domain: e.domain,
    status: e.status,
    startDate: e.start_date,
    endDate: e.end_date,
  })),
  recentResults: (recentResults || []).map((r: any) => ({
    id: r.user_experiments.id,
    name: r.user_experiments.name,
    domain: r.user_experiments.domain,
    recommendation: r.summary?.recommendation || 'inconclusive',
  })),
};
```

---

## 3.2. ExperimentCoachAgent

Create: `lib/agi/agents/experimentCoachAgent.ts`

```ts
import { Agent, makeAgentResult } from '../agents';
import { AgentContext, AGIAction } from '../types';

export const experimentCoachAgent: Agent = {
  name: 'ExperimentCoachAgent',
  description: 'Proposes structured experiments to improve user outcomes based on weak metrics.',
  domains: ['focus', 'workflows', 'communication', 'finance', 'relationships'],
  priority: 75,
  defaultAggressiveness: 'balanced',

  async run(ctx: AgentContext) {
    const actions: AGIAction[] = [];
    const world: any = ctx.world;
    const optimization = world.optimization;

    // Don't overload user with too many experiments
    const activeCount = optimization?.activeExperiments?.length || 0;
    if (activeCount >= 3) {
      return makeAgentResult(
        'ExperimentCoachAgent',
        'User already has 3 active experiments. Waiting for completion before suggesting more.',
        [],
        0.2,
      );
    }

    // Check for issues that could benefit from experiments
    const stressLevel = world.emotion?.currentStress || 0.5;
    const taskCompletionRate =
      world.time?.todayTasks?.filter((t: any) => t.status === 'completed').length /
        Math.max(world.time?.todayTasks?.length || 1, 1) || 0.5;
    const calendarOverload = world.time?.dayFeatures?.overload || false;

    // Executive function overwhelm
    if (stressLevel > 0.7 && taskCompletionRate < 0.6) {
      actions.push({
        type: 'nudge_user',
        label: 'Try a 14-day morning deep work experiment',
        details: {
          message: 'Your stress is high and task completion is low. A structured deep work experiment could help.',
          domain: 'focus',
          subsource: 'experiment_coach_agent',
          metadata: {
            experimentTemplateKey: 'deep_work_morning_block',
            suggestedStartDate: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          },
        },
        requiresConfirmation: true,
        riskLevel: 'low',
      });
    }

    // Calendar overload
    if (calendarOverload && stressLevel > 0.6) {
      actions.push({
        type: 'nudge_user',
        label: 'Try an evening shutdown ritual experiment',
        details: {
          message: 'Your calendar is overloaded and stress is elevated. An evening shutdown ritual could help you decompress and plan better.',
          domain: 'workflows',
          subsource: 'experiment_coach_agent',
          metadata: {
            experimentTemplateKey: 'evening_shutdown_ritual',
            suggestedStartDate: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          },
        },
        requiresConfirmation: true,
        riskLevel: 'low',
      });
    }

    // Financial clarity low
    const financialClarity = world.finances?.cashflowSummary ? 0.7 : 0.3;
    if (financialClarity < 0.5 && stressLevel > 0.5) {
      actions.push({
        type: 'nudge_user',
        label: 'Try a weekly money check-in experiment',
        details: {
          message: 'Financial clarity is low and may be contributing to stress. A weekly check-in experiment could help.',
          domain: 'finance',
          subsource: 'experiment_coach_agent',
          metadata: {
            experimentTemplateKey: 'finance_weekly_money_checkin',
            suggestedStartDate: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          },
        },
        requiresConfirmation: true,
        riskLevel: 'low',
      });
    }

    const reasoning = `Analyzed user metrics. Found ${actions.length} experiment opportunity(ies). User has ${activeCount} active experiment(s).`;

    return makeAgentResult('ExperimentCoachAgent', reasoning, actions, 0.7);
  },
};
```

---

# SECTION 4 — API LAYER

## 4.1. Template & Catalog API

`app/api/experiments/templates/route.ts`:

```ts
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { listExperimentTemplatesByDomain } from '@/lib/experiments/templates';
import { supabaseAdmin } from '@/lib/supabase';

export async function GET(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const searchParams = req.nextUrl.searchParams;
    const domain = searchParams.get('domain');

    if (domain) {
      const templates = await listExperimentTemplatesByDomain(domain);
      return NextResponse.json({ templates });
    }

    // Get all templates
    const { data, error } = await supabaseAdmin
      .from('experiment_templates')
      .select('*');

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ templates: data || [] });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
```

---

## 4.2. User Experiments API

`app/api/experiments/user/route.ts`:

```ts
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { createUserExperiment } from '@/lib/experiments/service';
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

    const { data, error } = await supabaseAdmin
      .from('user_experiments')
      .select('*')
      .eq('user_id', dbUserId)
      .order('created_at', { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ experiments: data || [] });
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
    const { templateKey, overrides } = body;

    if (!templateKey) {
      return NextResponse.json({ error: 'templateKey is required' }, { status: 400 });
    }

    const experimentId = await createUserExperiment(userId, templateKey, overrides);

    return NextResponse.json({ experimentId });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
```

`app/api/experiments/user/[experimentId]/start/route.ts`:

```ts
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { startExperiment } from '@/lib/experiments/service';

export async function POST(
  req: NextRequest,
  { params }: { params: { experimentId: string } },
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const body = await req.json();
    await startExperiment(params.experimentId, body.startDate);

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
```

---

# SECTION 5 — UI: EXPERIMENT LAB

Create: `app/(authenticated)/experiments/lab/page.tsx`

```tsx
'use client';

import { useState, useEffect } from 'react';
import { AppCard } from '@/components/ui/AppCard';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';
import { Badge } from '@/components/ui/badge';

export default function ExperimentLabPage() {
  const router = useRouter();
  const [experiments, setExperiments] = useState<any[]>([]);
  const [templates, setTemplates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    const [expsRes, templatesRes] = await Promise.all([
      fetch('/api/experiments/user'),
      fetch('/api/experiments/templates'),
    ]);

    if (expsRes.ok) {
      const data = await expsRes.json();
      setExperiments(data.experiments || []);
    }

    if (templatesRes.ok) {
      const data = await templatesRes.json();
      setTemplates(data.templates || []);
    }

    setLoading(false);
  }

  async function createExperiment(templateKey: string) {
    const res = await fetch('/api/experiments/user', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ templateKey }),
    });

    if (res.ok) {
      fetchData();
    }
  }

  async function startExperiment(experimentId: string) {
    const res = await fetch(`/api/experiments/user/${experimentId}/start`, {
      method: 'POST',
    });

    if (res.ok) {
      fetchData();
    }
  }

  const active = experiments.filter((e) => e.status === 'running');
  const planned = experiments.filter((e) => e.status === 'planned');
  const completed = experiments.filter((e) => e.status === 'completed');

  return (
    <div className="container mx-auto p-6 space-y-6">
      <h1 className="text-2xl font-bold text-white">Experiment Lab</h1>

      <AppCard className="p-6">
        <h2 className="text-xl font-semibold text-white mb-4">About Experiments</h2>
        <p className="text-white/80 mb-2">
          Pulse runs small, safe experiments to learn what works best for you. Each experiment
          tests a specific behavior change and measures the impact on your metrics.
        </p>
        <p className="text-white/60 text-sm">
          All experiments are reversible and require your explicit consent.
        </p>
      </AppCard>

      <AppCard className="p-6">
        <h2 className="text-xl font-semibold text-white mb-4">Active Experiments</h2>
        {active.length === 0 ? (
          <p className="text-white/60">No active experiments.</p>
        ) : (
          <div className="space-y-3">
            {active.map((exp) => (
              <div key={exp.id} className="p-4 bg-black/30 rounded">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="text-white font-medium">{exp.name}</h3>
                    <p className="text-white/60 text-sm">{exp.hypothesis}</p>
                    <Badge className="mt-2 bg-green-500">{exp.status}</Badge>
                  </div>
                  <Button
                    onClick={() => router.push(`/experiments/${exp.id}`)}
                    size="sm"
                  >
                    View
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </AppCard>

      <AppCard className="p-6">
        <h2 className="text-xl font-semibold text-white mb-4">Planned Experiments</h2>
        {planned.length === 0 ? (
          <p className="text-white/60">No planned experiments.</p>
        ) : (
          <div className="space-y-3">
            {planned.map((exp) => (
              <div key={exp.id} className="p-4 bg-black/30 rounded">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="text-white font-medium">{exp.name}</h3>
                    <p className="text-white/60 text-sm">Starts: {exp.start_date}</p>
                  </div>
                  <div className="flex gap-2">
                    <Button onClick={() => startExperiment(exp.id)} size="sm">
                      Start
                    </Button>
                    <Button
                      onClick={() => router.push(`/experiments/${exp.id}`)}
                      size="sm"
                      variant="outline"
                    >
                      View
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </AppCard>

      <AppCard className="p-6">
        <h2 className="text-xl font-semibold text-white mb-4">Available Templates</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {templates.map((template) => (
            <div key={template.key} className="p-4 bg-black/30 rounded">
              <h3 className="text-white font-medium">{template.name}</h3>
              <p className="text-white/60 text-sm mb-2">{template.description}</p>
              <Badge>{template.domain}</Badge>
              <Button
                onClick={() => createExperiment(template.key)}
                size="sm"
                className="mt-2"
              >
                Create Experiment
              </Button>
            </div>
          ))}
        </div>
      </AppCard>

      <AppCard className="p-6">
        <h2 className="text-xl font-semibold text-white mb-4">Past Experiments</h2>
        {completed.length === 0 ? (
          <p className="text-white/60">No completed experiments yet.</p>
        ) : (
          <div className="space-y-3">
            {completed.map((exp) => (
              <div key={exp.id} className="p-4 bg-black/30 rounded">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="text-white font-medium">{exp.name}</h3>
                    <p className="text-white/60 text-sm">
                      {exp.start_date} to {exp.end_date}
                    </p>
                  </div>
                  <Button
                    onClick={() => router.push(`/experiments/${exp.id}`)}
                    size="sm"
                  >
                    View Results
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </AppCard>
    </div>
  );
}
```

---

# SECTION 6 — VOICE & NATURAL INTERACTION

## 6.1. Voice Intents

Update `lib/voice/intent_detector.ts`:

```ts
// Add experiment detection
if (
  lowerText.includes('experiment') ||
  lowerText.includes('try something') ||
  lowerText.includes('what works') ||
  lowerText.includes('learned from')
) {
  return {
    route: 'experiments',
    intent: extractExperimentIntent(text),
  };
}
```

## 6.2. Voice Route

Create: `lib/voice/routes/experiments.ts`

```ts
import { VoiceRouteResult } from '../router';
import { supabaseAdmin } from '@/lib/supabase';
import { createUserExperiment } from '@/lib/experiments/service';

async function resolveUserId(clerkId: string): Promise<string> {
  const { data: userRow } = await supabaseAdmin
    .from("users")
    .select("id")
    .eq("clerk_id", clerkId)
    .maybeSingle();

  return userRow?.id || clerkId;
}

export async function handleExperimentsVoiceTurn(params: {
  userId: string;
  sessionId: string;
  text: string;
  intent: any;
}): Promise<VoiceRouteResult> {
  const lowerText = params.text.toLowerCase();

  // Check active experiments
  const dbUserId = await resolveUserId(params.userId);
  const { data: activeExps } = await supabaseAdmin
    .from('user_experiments')
    .select('name, domain')
    .eq('user_id', dbUserId)
    .eq('status', 'running');

  if (lowerText.includes('what experiments') || lowerText.includes('running')) {
    if (activeExps && activeExps.length > 0) {
      const names = activeExps.map((e) => e.name).join(', ');
      return {
        route: 'experiments',
        text: `You're currently running ${activeExps.length} experiment(s): ${names}.`,
      };
    }
    return {
      route: 'experiments',
      text: "You don't have any active experiments right now.",
    };
  }

  // Suggest experiment
  if (lowerText.includes('focus') || lowerText.includes('productivity')) {
    try {
      await createUserExperiment(params.userId, 'deep_work_morning_block');
      return {
        route: 'experiments',
        text: "I've created a 14-day morning deep work experiment for you. Go to Experiment Lab to start it.",
      };
    } catch (err) {
      return {
        route: 'experiments',
        text: "I had trouble creating that experiment. Please try from the Experiment Lab page.",
      };
    }
  }

  return {
    route: 'experiments',
    text: "I can help you set up experiments for focus, workflows, communication, or finances. What would you like to try?",
  };
}
```

---

# SECTION 7 — SAFETY & RESTRICTIONS

Hard constraints:

1. **No medical treatment or diet/medication experiments**.
2. **Financial caution**: No high-risk financial experiments.
3. **Psychological safety**: Avoid intense relationship stress tests.
4. **Explicit consent**: Every experiment must be explicitly accepted.

---

# SECTION 8 — ACCEPTANCE CRITERIA

Phase 17 is **complete** when:

### ✅ Data & Engine

1. All experiment tables exist and work.
2. At least 3–5 experiment templates are seeded.
3. `collectDailyMetricsForExperiment` can gather metrics from existing modules.
4. `computeExperimentResults` produces structured summaries.

### ✅ AGI Integration

1. `ExperimentCoachAgent` appears in AGI runs and proposes experiments.
2. WorldState includes active experiments and recent results.

### ✅ UI & Voice

1. `/experiments/lab` shows active, planned, and past experiments.
2. `/experiments/[experimentId]` shows metrics and results.
3. Voice can handle experiment-related questions.

### ✅ Safety & Preferences

1. Users can toggle experiment suggestions and domains.
2. All experiments are clearly labeled and easily cancellable.
3. No medical, extreme diet, or risky financial experiments.

---

**End of spec.**


