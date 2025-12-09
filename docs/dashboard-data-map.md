# Dashboard Data Flow Map

This document maps all data sources required for each widget in the Life Dashboard.

---

## 📊 Widget Data Requirements

### 1. TodaySummary

**Data Sources:**
- **Greeting:** Client-side calculation (time of day)
- **Focus Items:** 
  - Source: `app/api/tasks/pull` → Filter by priority="High" AND status="In Progress"
  - Source: `app/api/goals/pull` → Filter by dueDate=today
- **Stats:**
  - Tasks: `app/api/tasks/pull` → Count completed vs total for today
  - Habits: `app/api/habits/pull` → Count completed vs total for today

**Data Flow:**
```
Tasks API → Filter by date/priority → Aggregate counts
Habits API → Filter by date → Aggregate counts
Goals API → Filter by dueDate=today → Extract focus items
```

---

### 2. CalendarPreview

**Data Sources:**
- **Events:** `app/api/calendar/today` → Returns events for current day
- **Date:** Client-side (current date)

**Data Flow:**
```
Calendar API → Filter by date=today → Return events array
```

**Event Shape:**
```typescript
{
  id: string;
  title: string;
  start: string; // ISO datetime
  end: string; // ISO datetime
  location?: string;
  attendees?: string[];
}
```

---

### 3. XPOverview

**Data Sources:**
- **XP Aggregates:** `app/api/xp/overview` → Returns all 5 XP categories + belt
- **XP History:** `app/api/xp/history` → For trend visualization (future)

**Data Flow:**
```
XP API → Aggregate XP from ledger → Calculate levels → Return summary
```

**Data Shape:**
```typescript
{
  dxp: number;      // Discipline XP
  pxp: number;      // Power XP
  ixp: number;      // Identity XP
  axp: number;      // Achievement XP
  mxp: number;      // Momentum XP
  belt: string;     // Current belt rank
  levels: {
    dxp: number;
    pxp: number;
    ixp: number;
    axp: number;
    mxp: number;
  };
  ascensionLevel: number;
}
```

---

### 4. IdentityInsights

**Data Sources:**
- **Identity Profile:** `app/api/identity/insights` → Returns primary role, clarity, alignment
- **Identity Graph:** `app/api/identity/graphs` → For detailed visualization (future)

**Data Flow:**
```
Identity Engine → Calculate primary role → Calculate clarity score → Calculate alignment score
```

**Data Shape:**
```typescript
{
  primaryRole: string;      // "Builder", "Leader", "Warrior", etc.
  clarity: number;           // 0-1, how clear identity is
  alignment: number;         // 0-1, how aligned actions are with identity
  roles: Array<{
    id: string;
    name: string;
    resonance: number;
  }>;
  traits: Array<{
    id: string;
    name: string;
    strength: number;
  }>;
}
```

---

### 5. MemoryHighlights

**Data Sources:**
- **Daily Summary:** `app/api/memory/highlights` → Returns day summary, key moments, emotional trend
- **Memory Continuum:** `lib/memory/engine.ts` → For semantic search (future)

**Data Flow:**
```
Memory Engine → Query today's memories → Generate summary → Extract key moments → Analyze emotional trend
```

**Data Shape:**
```typescript
{
  daySummary: string;           // AI-generated summary of the day
  keyMoments: string[];          // Array of significant moments
  emotionalTrend: string | null; // "Positive", "Neutral", "Stressed", etc.
  memoryCount: number;           // Total memories captured today
  compressionLevel: string;       // "Daily", "Weekly", "Monthly"
}
```

**Memory Sources:**
- Journal entries
- Completed tasks
- Call summaries
- Email interactions
- Habit completions
- Relationship interactions

---

### 6. ButlerRecommendations

**Data Sources:**
- **Butler Engine:** `app/api/butler/recommendations` → Returns AI-generated recommendations
- **Proactive Scanner:** `app/api/pulse/proactive` → For insight detection (future integration)

**Data Flow:**
```
Butler Engine → Analyze:
  - Overdue tasks
  - Stale deals
  - Cold relationships
  - Upcoming deadlines
  - Streak risks
→ Generate prioritized recommendations
```

**Data Shape:**
```typescript
{
  recommendations: Array<{
    id: string;
    text: string;
    priority: "high" | "medium" | "low";
    category: "task" | "relationship" | "deal" | "habit" | "planning";
    actionUrl?: string;
  }>;
  generatedAt: string; // ISO datetime
}
```

**Recommendation Categories:**
- Task follow-ups
- Relationship maintenance
- Deal progression
- Habit streak protection
- Weekly planning
- Email responses needed

---

### 7. PhilosophyProgress

**Data Sources:**
- **Philosophy Dojo:** `app/api/philosophy/progress` → Returns active path, belt, practice stats
- **Training History:** `app/api/philosophy/training` → For detailed progress (future)

**Data Flow:**
```
Philosophy Engine → Get active path → Get current belt → Count practices this week
```

**Data Shape:**
```typescript
{
  activePath: string;           // "Stoic", "Samurai", "Taoist", etc.
  currentBelt: string;           // "White", "Yellow", "Orange", etc.
  practicesCompleted: number;    // Practices completed this week
  practicesTotal: number;        // Total practices available this week
  pathProgress: number;          // 0-1, overall path progress
  nextBelt: string | null;       // Next belt to achieve
  xpEarned: number;              // Philosophy XP earned this week
}
```

---

### 8. RelationshipHealth

**Data Sources:**
- **Relationships:** `app/api/relationships/health` → Returns relationship health scores
- **Second Brain:** `app/api/second-brain/pull` → For contact data (future integration)

**Data Flow:**
```
Relationship Engine → Calculate health scores → Sort by priority → Return top relationships
```

**Data Shape:**
```typescript
{
  relationships: Array<{
    id: string;
    name: string;
    health: number;              // 0-1, relationship health score
    lastContact: string;         // ISO datetime
    interactionCount: number;    // Interactions in last 30 days
    sentiment: "positive" | "neutral" | "negative";
    priority: "high" | "medium" | "low";
  }>;
  totalRelationships: number;
  averageHealth: number;
}
```

**Health Calculation Factors:**
- Recency of contact
- Frequency of interactions
- Sentiment analysis
- Response rates
- Engagement quality

---

## 🔄 Data Aggregation Strategy

### Parallel Loading
All widgets should load data in parallel using `Promise.all()` to minimize load time.

### Caching Strategy
- **Client-side:** Cache API responses for 60 seconds
- **Server-side:** Consider Redis caching for expensive queries
- **Invalidation:** Invalidate on user actions (task complete, habit log, etc.)

### Error Handling
- Each widget should handle loading and error states independently
- Failed widgets should not block other widgets from rendering
- Show fallback UI for missing data

---

## 📡 API Endpoints Summary

| Widget | Endpoint | Method | Auth Required |
|--------|----------|--------|---------------|
| TodaySummary | `/api/tasks/pull` | GET | Yes |
| TodaySummary | `/api/habits/pull` | GET | Yes |
| TodaySummary | `/api/goals/pull` | GET | Yes |
| CalendarPreview | `/api/calendar/today` | GET | Yes |
| XPOverview | `/api/xp/overview` | GET | Yes |
| IdentityInsights | `/api/identity/insights` | GET | Yes |
| MemoryHighlights | `/api/memory/highlights` | GET | Yes |
| ButlerRecommendations | `/api/butler/recommendations` | GET | Yes |
| PhilosophyProgress | `/api/philosophy/progress` | GET | Yes |
| RelationshipHealth | `/api/relationships/health` | GET | Yes |

---

## 🎯 Future Enhancements

### Real-time Updates
- WebSocket connections for live data updates
- Server-Sent Events (SSE) for push notifications

### Data Prefetching
- Prefetch next page data on scroll
- Prefetch related data on hover

### Smart Refresh
- Auto-refresh every 5 minutes
- Manual refresh button
- Optimistic updates on user actions

---

*This document should be updated as new data sources are added or requirements change.*

