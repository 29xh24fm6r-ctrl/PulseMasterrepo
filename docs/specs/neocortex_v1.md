# Pulse Neocortex v1 — Backend Spec (Claude Sprint)

## 0. Goal

Add a **Neocortex layer** on top of the AGI Kernel that:

1. Ingests normalized events from Pulse (work, tasks, deals, meetings, habits, notes).
2. Computes **cortical signals** (derived metrics per day/context).
3. Learns **patterns** (recurring behavior shapes, correlations).
4. Extracts **skills** (reusable playbooks from repeated sequences).
5. Exposes predictions & anomalies to:
   * Coaches (Sales, Career, Confidant, Financial)
   * Autopilot / Butler
   * Dashboards (Life + Work)

We're focusing **v1** on the **Work Cortex** (tasks, deals, meetings, email, notes).

---

## Implementation Status

✅ **COMPLETE** - All phases implemented:

- ✅ Database migrations (7 tables)
- ✅ TypeScript types
- ✅ Event ingestion system
- ✅ Signals engine (daily metrics)
- ✅ Patterns engine (LLM-assisted)
- ✅ Skills engine (playbook extraction)
- ✅ Predictor & anomaly detection
- ✅ API endpoints (6 routes)
- ✅ Context helper for coaches

---

## Files Created

### Database
- `supabase/migrations/20260120_neocortex_v1.sql`

### Core Modules
- `lib/cortex/types.ts` - Type definitions
- `lib/cortex/ingest.ts` - Event ingestion
- `lib/cortex/signals.ts` - Signals engine
- `lib/cortex/patterns.ts` - Patterns engine
- `lib/cortex/skills.ts` - Skills engine
- `lib/cortex/predict.ts` - Predictions & anomalies
- `lib/cortex/context.ts` - Coach context helper

### API Routes
- `app/api/cortex/signals/route.ts`
- `app/api/cortex/patterns/route.ts`
- `app/api/cortex/skills/route.ts`
- `app/api/cortex/predictions/route.ts`
- `app/api/cortex/anomalies/route.ts`
- `app/api/cortex/refresh/route.ts`

---

## Next Steps

1. **Run migrations** in Supabase
2. **Wire event ingestion** into existing systems:
   - Task completion → `recordTaskCompleted()`
   - Deal stage changes → `recordDealStageChanged()`
   - Meeting events → `recordMeetingHeld()`
   - Email sent → `recordEmailSent()`
3. **Set up cron job** to call `/api/cortex/refresh` daily
4. **Integrate with coaches** using `getWorkCortexContextForUser()`

---

## Usage Examples

### Manual Refresh
```bash
POST /api/cortex/refresh
```

### Query Signals
```bash
GET /api/cortex/signals?area=work&from=2026-01-01&to=2026-01-20
```

### Get Patterns
```bash
GET /api/cortex/patterns?area=work
```

### Get Coach Context
```typescript
import { getWorkCortexContextForUser } from '@/lib/cortex/context';

const context = await getWorkCortexContextForUser(userId);
// Use context.recentSignals, context.strongestPatterns, etc. in coach prompts
```

---

## Notes

- All implementations follow the spec exactly
- LLM calls use existing `callAIJson` from `lib/ai/call.ts`
- User resolution uses Clerk ID → DB user ID pattern
- All tables use `users(id)` foreign keys (not `auth.users`)
- Signals are computed daily, patterns/skills refreshed on demand
- Anomalies use simple statistical approach (2+ stddev threshold)


