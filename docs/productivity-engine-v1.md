# Pulse Productivity Engine v1

## Overview

The **Pulse Productivity Engine v1** transforms the `/work` (or `/productivity`) section into a unified execution hub that aggregates actionable work from across Pulse, ranks it into a prioritized queue, and provides Focus Modes for deep work.

## Core Architecture

### Data Flow

```
User → /work page
  ↓
TodayCommandQueue component
  ↓
/api/productivity/today-queue
  ↓
lib/productivity/queue.ts::buildTodayQueue()
  ↓
Aggregates from:
  - Tasks (pending/in_progress)
  - Email followups
  - Relationship nudges
  - Deal nudges
  - Autopilot suggestions
  ↓
Scoring & Filtering:
  - Importance (60%) + Urgency (40%)
  - Weekly plan priorities (boost matching items)
  - Emotion-aware adjustments
  ↓
Returns prioritized WorkItem[] (5-15 items)
```

### Key Components

#### 1. Today Command Queue (`TodayCommandQueue.tsx`)

- Displays prioritized work items from all sources
- Shows source badges (Task, Email, Relationship, Deal, Autopilot)
- Actions: Do Now, Snooze, Mark Done
- Auto-refreshes when items are completed

#### 2. Focus Modes Panel (`FocusModesPanel.tsx`)

Two focus modes:

- **Single Focus**: One task, 25-minute timer, full attention
- **Power Hour**: 6-12 micro-tasks, 60-minute timer, checklist format

Features:
- Timer with pause/reset
- Session tracking via API
- XP awarded on completion

#### 3. Plan/Review Strip (`PlanReviewStrip.tsx`)

- **Today's Plan**: Shows Big 3 outcomes from weekly planning
- **Daily Review**: End-of-day reflection with stats (sessions, completed items, XP)

### Data Structures

#### WorkItem

```typescript
interface WorkItem {
  id: string; // Format: "source_id" (e.g., "task_123", "email_456")
  source: WorkItemSource;
  title: string;
  description?: string;
  dueAt?: string | null;
  projectId?: string | null;
  relationshipId?: string | null;
  dealId?: string | null;
  emailId?: string | null;
  estimatedMinutes?: number;
  importanceScore: number; // 0-100
  urgencyScore: number; // 0-100
  energyRequired: "low" | "medium" | "high";
  tags?: string[];
  metadata?: Record<string, any>; // Source-specific data
}
```

#### FocusSession

```typescript
interface FocusSession {
  id: string;
  userId: string;
  mode: "single_task" | "power_hour";
  startedAt: string;
  endedAt?: string | null;
  workItemIds: string[];
  completedCount: number;
  totalPlanned: number;
  xpAwarded?: number;
}
```

### APIs

#### GET `/api/productivity/today-queue`

Returns prioritized work queue for the current user.

**Response:**
```json
{
  "queue": [
    {
      "id": "task_123",
      "source": "task",
      "title": "Complete project proposal",
      "importanceScore": 80,
      "urgencyScore": 70,
      ...
    }
  ]
}
```

#### POST `/api/productivity/focus-session`

Start or end a focus session.

**Start:**
```json
{
  "action": "start",
  "mode": "single_task",
  "workItemIds": ["task_123"]
}
```

**End:**
```json
{
  "action": "end",
  "sessionId": "session_uuid",
  "completedItemIds": ["task_123"]
}
```

#### GET `/api/productivity/focus-session`

Get active focus session for current user.

### Integration Points

#### 1. Autopilot Engine

- Pulls suggested actions from `autopilot_actions` table (status: "suggested")
- Maps action types to WorkItems:
  - `create_task` → Task WorkItem
  - `email_followup` → Email WorkItem
  - `relationship_checkin` → Relationship WorkItem
- User can accept/reject suggestions directly from queue

#### 2. Emotion OS

- Adjusts queue size and energy requirements based on emotional state:
  - **Stressed/Overwhelmed**: Smaller queue (5 items), low/medium energy only
  - **Excited/Motivated**: Full queue, all energy levels
  - **Sad/Anxious**: Quick wins (8 items), low energy or <15 min tasks

#### 3. Weekly Planning Engine

- Boosts items that match weekly "Big 3" priorities (+20 score)
- Shows Big 3 in PlanReviewStrip

#### 4. XP Engine

- Awards XP on focus session completion:
  - Base: 10 XP per completed item
  - Completion bonus: +20 XP if 80%+ completion rate
  - Duration bonus: +15 XP if session ≥25 minutes
- Logs to `xp_transactions` table with category "discipline"

#### 5. Coaching System

- "Ask Productivity Coach" button in header
- Routes to Motivational/Productivity coach
- Passes context: current queue, focus mode, weekly priorities

### Database Schema

#### focus_sessions

```sql
CREATE TABLE focus_sessions (
  id uuid PRIMARY KEY,
  user_id uuid REFERENCES users(id),
  mode text CHECK (mode IN ('single_task', 'power_hour')),
  started_at timestamptz NOT NULL,
  ended_at timestamptz,
  work_item_ids text[] NOT NULL,
  completed_count int NOT NULL DEFAULT 0,
  total_planned int NOT NULL DEFAULT 0,
  xp_awarded int,
  created_at timestamptz NOT NULL DEFAULT now()
);
```

### Scoring Algorithm

```typescript
finalScore = importanceScore * 0.6 + urgencyScore * 0.4;

// Importance based on:
// - Task priority (critical: 100, high: 70, medium: 40, low: 10)
// - Relationship score (for relationship nudges)
// - Autopilot risk level

// Urgency based on:
// - Due date proximity
// - Days since last interaction (for relationships)
```

### Future Enhancements

1. **God Mode**: Productivity Coach can rewrite queue on the fly based on real-time changes
2. **Pipeline Grind Mode**: Sales-specific focus mode for deal/relationship work
3. **Smart Snooze**: Snooze with intelligent resurfacing based on context
4. **Batch Actions**: Complete multiple items at once
5. **Time Blocking**: Integrate with calendar for time-blocked focus sessions

## Files Created

- `lib/productivity/types.ts` - Type definitions
- `lib/productivity/queue.ts` - Queue builder and aggregator
- `lib/productivity/focus.ts` - Focus session management
- `app/api/productivity/today-queue/route.ts` - Queue API
- `app/api/productivity/focus-session/route.ts` - Focus session API
- `app/components/work/TodayCommandQueue.tsx` - Queue UI
- `app/components/work/FocusModesPanel.tsx` - Focus modes UI
- `app/components/work/PlanReviewStrip.tsx` - Plan/review UI
- `app/(authenticated)/work/page.tsx` - Main page
- `supabase/migrations/focus_sessions_v1.sql` - Database migration



