# Pulse Productivity Engine v2

## Overview

**Pulse Productivity Engine v2** upgrades v1 with **Executive Function (EF) Engine** and **Third Brain integration**, creating a fully autonomous task orchestration system that proactively plans, breaks down, sequences, and adapts the user's day.

## Key Upgrades from v1

1. **Executive Function Engine** - Analyzes cognitive load, breaks down tasks, sequences optimally
2. **Third Brain Integration** - Injects project context, notes, patterns, and cognitive profile
3. **Autonomous Orchestration** - Automatic replanning and adaptive adjustments
4. **EF-Weighted Scoring** - More sophisticated prioritization algorithm
5. **Task Restructuring** - High-load tasks automatically broken into micro-steps
6. **Learning Loop** - Telemetry tracks patterns to improve future planning

## Architecture

### Core Modules

#### 1. Executive Function Engine (`lib/productivity/executive-function.ts`)

**Functions:**
- `analyzeTask()` - Determines cognitive load, required context, breakdown needs
- `breakIntoSteps()` - Splits high-load tasks into 3-7 micro-steps
- `sequenceTasks()` - Orders tasks by cognitive load, energy, time of day, historical performance

**Key Types:**
```typescript
interface TaskAnalysis {
  cognitiveLoad: "low" | "medium" | "high";
  requiredContext: string[];
  needsBreakdown: boolean;
  optimalTimeOfDay?: "morning" | "afternoon" | "evening";
  energyRequirement: "low" | "medium" | "high";
  estimatedMicroSteps?: number;
}

interface MicroStep {
  id: string;
  parentTaskId: string;
  title: string;
  estimatedMinutes: number;
  cognitiveLoad: "low" | "medium" | "high";
  order: number;
}
```

#### 2. Third Brain Context Builder (`lib/productivity/context-builder.ts`)

**Function:**
- `buildThirdBrainProductivityContext()` - Aggregates:
  - Active projects with recent notes
  - Recent notes (last 72 hours)
  - Decision patterns from insights
  - Cognitive profile (peak hours, preferred task length, deep work capacity)
  - Motivational drivers
  - Emotional trend
  - Recent completed tasks
  - Self-reported constraints

**Key Types:**
```typescript
interface ThirdBrainContext {
  activeProjects: ProjectContext[];
  recentNotes: string[];
  decisionPatterns: PatternInsight[];
  cognitiveProfile: CognitiveProfile;
  motivationalDrivers: string[];
  emotionalTrend: {
    primary: string;
    intensity: number;
    trend: "improving" | "stable" | "declining";
  };
  recentCompletedTasks: Array<{...}>;
  constraints: string[];
}
```

#### 3. Upgraded Queue Builder (`lib/productivity/queue.ts`)

**New Scoring Algorithm:**
```
finalScore = 
  importance * 0.45 +
  urgency * 0.25 +
  thirdBrainRelevance * 0.15 +
  cognitiveFit * 0.15
```

**Process:**
1. Aggregate work items (tasks, emails, relationships, deals, autopilot)
2. Load Third Brain context
3. EF-weighted scoring with Third Brain relevance
4. Task restructuring (break down high-load tasks)
5. Daily filters (weekly plan priorities)
6. Emotion-aware adjustments
7. Safety guards (edge cases)

#### 4. Orchestrator (`lib/productivity/orchestrator.ts`)

**Functions:**
- `replanDay()` - Full day replanning using EF + Third Brain
- `adaptiveReplan()` - Triggered replanning for specific events:
  - `low_energy` - Filter to low-energy tasks
  - `task_avoidance` - Switch to recovery mode
  - `completion_burst` - Suggest power hour
  - `calendar_change` - Rebuild next 30-60 minutes

**Output:**
```typescript
interface DayPlan {
  userId: string;
  date: string;
  bigThree: Array<{ id: string; title: string }>;
  focusBlocks: FocusBlockPlan[];
  totalEstimatedMinutes: number;
}
```

#### 5. Telemetry & Learning (`lib/productivity/telemetry.ts`)

**Event Types:**
- `micro_step_completed`
- `task_avoided`
- `task_postponed`
- `session_interrupted`
- `ef_sequence_completed`
- `autonomous_replan_triggered`

**Learning Patterns:**
- Avoidance patterns (which task types are avoided)
- Completion patterns (success rate by time of day)
- Interruption patterns (reasons for session interruptions)

#### 6. XP Hooks (`lib/productivity/xp-hooks.ts`)

**XP Awards:**
- Planned block completion: 15 XP/item + completion bonuses
- Micro-step completion: 5 XP per step
- Focus session: 10 XP/item + duration bonus
- EF sequence completion: 20 XP/item + sequence bonuses

## UI Upgrades

### Autonomous Mode Toggle

- Checkbox in header: "Autonomous Mode (Pulse Plans My Day)"
- When enabled:
  - Queue updates automatically every 30 minutes
  - Shows "Pulse is restructuring your day..." indicator
  - Replan button available for manual triggers

### Visual Enhancements

- **Micro-steps visualization**: Nested display with chevron indicator
  ```
  ▸ Write proposal
    - Gather past notes
    - Outline
    - Draft intro
  ```

- **Live replanning indicator**: Pulsing dot with status message

## APIs

### GET `/api/productivity/today-queue`

**Query Params:**
- `autonomous=true` - Enable autonomous mode
- `ef=false` - Disable EF analysis
- `thirdBrain=false` - Disable Third Brain context

**Response:**
```json
{
  "queue": [...],
  "suggestion": "autopilot_scan" // If queue empty
}
```

### POST `/api/productivity/replan`

**Body:**
```json
{
  "action": "replan" | "adaptive",
  "trigger": "low_energy" | "task_avoidance" | "completion_burst" | "calendar_change"
}
```

## Safety Guards & Edge Cases

1. **Empty Queue**: Returns suggestion to run Autopilot scan
2. **Severely Stressed**: Blocks high-energy tasks, limits to 5 low-energy items
3. **Overwhelmed**: Recovery mode - only 3 low-energy tasks
4. **Task Avoidance**: Prioritizes quick wins (≤15 min tasks)
5. **Emotion Flags**: Adapts queue size and energy requirements based on emotional state

## Database Schema

### `executive_function_events`

```sql
CREATE TABLE executive_function_events (
  id uuid PRIMARY KEY,
  user_id uuid REFERENCES users(id),
  event_type text NOT NULL,
  work_item_id text,
  parent_task_id text,
  session_id uuid REFERENCES focus_sessions(id),
  metadata jsonb DEFAULT '{}',
  occurred_at timestamptz NOT NULL
);
```

## Integration Points

### Third Brain
- Pulls active projects, recent notes, decision patterns
- Builds cognitive profile from historical task completion data
- Injects emotional trend and constraints

### Emotion OS
- Adjusts queue size and energy requirements
- Influences task sequencing
- Triggers adaptive replanning

### Autopilot Engine
- Suggests tasks when queue is empty
- Integrates suggestions into queue with proper scoring

### XP Engine
- Awards XP for EF-driven actions
- Tracks completion patterns for learning

### Weekly Planning Engine
- Boosts items matching Big 3 priorities
- Extracts Big 3 for day plan

## Future Enhancements

1. **God Mode Integration**: Full autonomous planning without user questions
2. **Pipeline Grind Mode**: Sales-specific focus mode
3. **Smart Snooze**: Intelligent resurfacing based on context
4. **Batch Actions**: Complete multiple items at once
5. **Time Blocking**: Calendar integration for time-blocked sessions
6. **Predictive Avoidance**: Detect and prevent task avoidance patterns

## Files Created/Modified

**New Files:**
- `lib/productivity/executive-function.ts`
- `lib/productivity/context-builder.ts`
- `lib/productivity/orchestrator.ts`
- `lib/productivity/telemetry.ts`
- `lib/productivity/xp-hooks.ts`
- `app/api/productivity/replan/route.ts`
- `supabase/migrations/executive_function_v1.sql`
- `docs/productivity-engine-v2.md`

**Modified Files:**
- `lib/productivity/queue.ts` - Upgraded with EF scoring and restructuring
- `app/(authenticated)/work/page.tsx` - Added Autonomous Mode toggle
- `app/components/work/TodayCommandQueue.tsx` - Micro-step visualization
- `app/api/productivity/today-queue/route.ts` - Added query params

## Testing Checklist

- [ ] Task breakdown: High-load task (60+ min) → 3-7 micro-steps
- [ ] EF sequencing: Tasks ordered by cognitive load and time of day
- [ ] Third Brain relevance: Tasks related to active projects boosted
- [ ] Autonomous mode: Auto-replanning every 30 minutes
- [ ] Safety guards: Stressed user gets low-energy queue only
- [ ] XP awards: Micro-steps and sequences award XP correctly
- [ ] Telemetry: Events logged for learning patterns



