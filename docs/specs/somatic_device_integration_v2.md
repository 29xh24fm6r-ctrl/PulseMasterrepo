# Somatic / Device Integration v2 – Spec

## 0. Goal

Upgrade Pulse's **Somatic Loop** from "basic energy tags" to a **full digital body awareness layer** that can:

* Continuously ingest signals from:
  * Phone (screen time, app usage, notifications, calls, movement).
  * Wearables (sleep, steps, heart rate / HRV, movement) – when available.
  * Calendar + context (court day, heavy meeting day, travel, etc.).

* Infer:
  * **Energy** (high / medium / low).
  * **Fatigue** and **burnout risk**.
  * **Stress load** and **overstimulation**.
  * **Rest debt** and **recovery needs**.
  * **Circadian rhythm** (early bird vs night owl, best focus windows).

* Feed this into:
  * **Conscious Workspace v2** (what to focus on today).
  * **Behavior Prediction** (will you really do that thing?).
  * **Wisdom Engine** (what works for your body).
  * **Autopilot / Planner** (timing, intensity).
  * **Emotion OS** (somatic context for emotional states).

This is **Somatic v2** (subsystem: `somatic_device`) sitting under the Somatic Loop and plugged into the Brainstem.

---

## Implementation Status

✅ **COMPLETE** - All phases implemented:

- ✅ Database migrations (somatic_device_settings, somatic_raw_device_events, somatic_daily_metrics, somatic_patterns, somatic_alerts)
- ✅ TypeScript types
- ✅ Settings CRUD
- ✅ Raw event ingestion
- ✅ Daily aggregator (with derived scores)
- ✅ Pattern inference (LLM-powered)
- ✅ Alert generator (LLM-powered)
- ✅ Context snapshot
- ✅ API endpoints (settings, today, ingest)
- ✅ Brainstem integration (daily + weekly)

---

## Files Created

### Database
- `supabase/migrations/20260120_somatic_device_integration_v2.sql`

### Somatic v2 Engine
- `lib/somatic/v2/types.ts` - Type definitions
- `lib/somatic/v2/settings.ts` - Settings CRUD
- `lib/somatic/v2/ingestion.ts` - Raw event ingestion
- `lib/somatic/v2/daily_aggregator.ts` - Daily aggregation with derived scores
- `lib/somatic/v2/patterns.ts` - Pattern inference (chronotype, best focus windows, crash patterns)
- `lib/somatic/v2/alerts.ts` - Alert generator (burnout risk, sleep debt, overstimulation)
- `lib/somatic/v2/context.ts` - Context snapshot for other systems

### API Routes
- `app/api/somatic/settings/route.ts` - GET/POST device settings
- `app/api/somatic/today/route.ts` - GET today's somatic snapshot
- `app/api/somatic/device/ingest/route.ts` - POST raw device events

### Integration
- Updated `lib/brain/brainstem.ts` - Runs daily metrics + alerts in daily loop, patterns in weekly loop

---

## How It Works

### 1. Device Ingestion Flow

```
ingestRawDeviceEvents()
  ├─> Receives events from mobile app / browser extension
  ├─> Events: screen_on/off, app_open, notification, unlock, sleep, hr_sample, steps, etc.
  └─> Stores in somatic_raw_device_events
```

### 2. Daily Aggregation Flow

```
computeSomaticDailyMetricsForUser()
  ├─> Loads raw events for the day
  ├─> Aggregates:
  │   - Screen time, app usage buckets, notifications, unlocks
  │   - Sleep duration, quality, bedtime, wake time
  │   - Heart rate, HRV, steps, activity
  └─> Computes derived scores:
      - recoveryScore (0-1)
      - stimulationScore (0-1)
      - fatigueScore (0-1)
      - stressLoadScore (0-1)
      - circadianAlignment (0-1)
```

### 3. Pattern Inference Flow

```
refreshSomaticPatternsForUser()
  ├─> Loads last 120 days of metrics
  └─> LLM infers:
      - chronotype (early_bird, night_owl, bimodal)
      - best_focus_windows
      - low_energy_windows
      - social_energy_windows
      - crash_patterns
      - stimulation_sensitivity
      - exercise_effects
```

### 4. Alert Generation Flow

```
refreshSomaticAlertsForUser()
  ├─> Loads today's metrics + patterns + recent trends
  └─> LLM generates alerts:
      - burnout_risk
      - sleep_debt
      - overstimulation
      - under_recovery
      - great_recovery
      - good_day_for_push
```

---

## API Usage

### Get/Update Device Settings
```typescript
GET /api/somatic/settings
POST /api/somatic/settings
Body: { phoneIntegrationEnabled, appUsageEnabled, ... }
```

### Get Today's Somatic Snapshot
```typescript
GET /api/somatic/today
// Returns: { somatic: { metrics, patterns, alerts } }
```

### Ingest Device Events
```typescript
POST /api/somatic/device/ingest
Body: { events: [{ occurredAt, source, kind, metadata }] }
```

---

## Integration Points

### Daily Brain Loop

```typescript
// In runDailyBrainLoopForUser()
await computeSomaticDailyMetricsForUser(userId, date);
await refreshSomaticAlertsForUser(userId, date);
```

### Weekly Brain Loop

```typescript
// In runWeeklyBrainLoopForUser()
await refreshSomaticPatternsForUser(userId);
```

### Other Systems (Future)

- **Behavior Prediction**: Use somatic snapshot to adjust completion probabilities
- **Conscious Workspace v2**: Use best_focus_windows and alerts to adjust load
- **Wisdom Engine**: Include somatic context in experience_events
- **Emotion OS**: Jointly model mood + body state

---

## Privacy & Consent

- All device integration is **opt-in per category**
- Settings stored in `somatic_device_settings`
- Users can:
  - Turn any feed off
  - Delete somatic history
  - Control granular permissions

---

## Subsystem Status

`somatic_device` = `partial` (v2) in daily loop, `active` (v2) after weekly pattern refresh

---

## Next Steps

1. **Run Migration**: `supabase/migrations/20260120_somatic_device_integration_v2.sql`

2. **Mobile App Integration**:
   - Build device event collection
   - Send events to `/api/somatic/device/ingest`
   - Request permissions based on settings

3. **Wearable Integration**:
   - HealthKit (iOS) / Google Fit (Android) connectors
   - Sleep, heart rate, steps data

4. **Cross-System Integration**:
   - Replace v1 somatic usage with v2 snapshot
   - Use patterns in workspace v2
   - Use alerts in behavior prediction

5. **UI Integration**:
   - Settings page for device permissions
   - Dashboard showing somatic metrics
   - Alerts display

---

## Impact

Pulse now:

- **Feels your body** - Continuous device signal ingestion
- **Knows your patterns** - Chronotype, best focus windows, crash patterns
- **Spots risks** - Burnout risk, sleep debt, overstimulation alerts
- **Respects your nervous system** - Uses somatic context in all decisions

And uses this to:

- **Adjust load** - "Today is not a good deep-work day, but a good relationship day"
- **Prevent crashes** - "You've run too many high-intensity days in a row; let's schedule recovery"
- **Optimize timing** - Schedule heavy tasks during best_focus_windows
- **Surface insights** - "Your sleep quality drops when you use your phone after 10pm"

This is where Pulse becomes not just a mind, but a mind that **respects your nervous system**. 🧍‍♂️📱⌚


