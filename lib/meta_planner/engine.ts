// Meta-Planner Engine
// lib/meta_planner/engine.ts

import { supabaseAdmin } from '@/lib/supabase';
import { callAIJson } from '@/lib/ai/call';
import { PlanningContextInput } from './types';
import { createPlanningSession } from './session';

async function resolveUserId(clerkId: string): Promise<string> {
  const { data: userRow } = await supabaseAdmin
    .from("users")
    .select("id")
    .eq("clerk_id", clerkId)
    .maybeSingle();

  return userRow?.id || clerkId;
}

const META_PLANNER_PROMPT = `
You are the Meta-Planner / Conflict Resolver.

You see:
- A conscious frame (what the user's mind is currently juggling).
- Conflicts from the Global Workspace.
- Timeline and Destiny contexts.
- Self Mirror snapshot (how they're actually living).
- Emotion and Somatic state (capacity today/this week).
- Social state and culture contexts.
- Tasks, routines, and calendar commitments.

Your job:
1. Understand what needs planning (daily, weekly, or conflict_resolution).
2. Extract constraints:
   - Time limits, energy limits, non-negotiable commitments, values/destiny constraints, social risks.
3. Decide:
   - Which tasks/projects/routines to prioritize.
   - What to defer, cancel, or pause.
   - How to respect health/relationships while still pushing goals.

You must:
- Favor sustainable plans over heroic but unrealistic ones.
- Align decisions with the user's values and destiny path.
- Avoid sacrificing critical relationships or health for short-term wins.

Return JSON: {
  "plan": {
    "sessionSummary": "...",
    "alignmentScore": 0..1,
    "stressBudget": 0..1,
    "energyBudget": 0..1,
    "constraints": [ { kind, label, description, payload }, ... ],
    "decisions": [
      {
        "decisionKind": "prioritize_task" | "defer_task" | "cancel_task" |
                        "activate_routine" | "pause_routine" | "adjust_goal",
        "targetType": "task" | "routine" | "project" | "timeline_arc",
        "targetId": "...",
        "priority": 0..1,
        "rationale": "..."
      },
      ...
    ]
  }
}

Only return valid JSON.`;

export async function runMetaPlannerForUser(
  userId: string,
  ctx: PlanningContextInput
) {
  const sessionId = await createPlanningSession(userId, ctx);

  const result = await callAIJson<{
    plan: {
      sessionSummary: string;
      alignmentScore: number;
      stressBudget: number;
      energyBudget: number;
      constraints: Array<{
        kind: string;
        label: string;
        description?: string;
        payload?: any;
      }>;
      decisions: Array<{
        decisionKind: string;
        targetType: string;
        targetId?: string;
        priority?: number;
        rationale: string;
      }>;
    };
  }>({
    userId,
    feature: 'meta_planner',
    systemPrompt: META_PLANNER_PROMPT,
    userPrompt: JSON.stringify({
      sessionId,
      ctx: {
        kind: ctx.kind,
        triggerSource: ctx.triggerSource,
        consciousFrame: ctx.consciousFrame ? {
          summary: ctx.consciousFrame.summary,
          dominantContext: ctx.consciousFrame.dominant_context,
          overallUrgency: ctx.consciousFrame.overall_urgency,
        } : null,
        conflicts: ctx.conflicts?.map((c: any) => ({
          conflictKind: c.conflict_kind,
          severity: c.severity,
          description: c.description,
        })) ?? [],
        timelineContext: ctx.timelineContext,
        destinyContext: ctx.destinyContext,
        selfMirrorSnapshot: ctx.selfMirrorSnapshot,
        emotionState: ctx.emotionState,
        somaticState: ctx.somaticState,
        socialState: ctx.socialState,
        tasksCount: ctx.tasksSnapshot?.length ?? 0,
        routinesCount: ctx.routinesSnapshot?.length ?? 0,
        calendarCount: ctx.calendarSnapshot?.length ?? 0,
      },
    }, null, 2),
    maxTokens: 4000,
    temperature: 0.7,
  });

  if (!result.success || !result.data) {
    console.error('[Meta-Planner] Failed to generate plan', result.error);
    return { sessionId, decisions: [] };
  }

  const { plan } = result.data;

  // Update session with summary & budgets
  const dbUserId = await resolveUserId(userId);
  const { error: sessionError } = await supabaseAdmin
    .from('planning_sessions')
    .update({
      summary: plan.sessionSummary ?? null,
      alignment_score: plan.alignmentScore ?? null,
      stress_budget: plan.stressBudget ?? null,
      energy_budget: plan.energyBudget ?? null,
    })
    .eq('id', sessionId);

  if (sessionError) throw sessionError;

  // Insert constraints
  const constraintRows = (plan.constraints ?? []).map((c) => ({
    user_id: dbUserId,
    session_id: sessionId,
    kind: c.kind,
    label: c.label,
    description: c.description ?? null,
    payload: c.payload ?? {},
  }));

  if (constraintRows.length) {
    const { error: cErr } = await supabaseAdmin
      .from('planning_constraints')
      .insert(constraintRows);
    if (cErr) throw cErr;
  }

  // Insert decisions
  const decisionRows = (plan.decisions ?? []).map((d) => ({
    user_id: dbUserId,
    session_id: sessionId,
    decision_kind: d.decisionKind,
    target_type: d.targetType,
    target_id: d.targetId ?? null,
    priority: d.priority ?? null,
    rationale: d.rationale,
  }));

  let decisionsInserted: any[] = [];
  if (decisionRows.length) {
    const { data: dData, error: dErr } = await supabaseAdmin
      .from('planning_decisions')
      .insert(decisionRows)
      .select('*');
    if (dErr) throw dErr;
    decisionsInserted = dData ?? [];
  }

  return { sessionId, decisions: decisionsInserted };
}


