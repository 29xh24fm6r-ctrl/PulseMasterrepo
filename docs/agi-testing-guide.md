# AGI Kernel Testing Guide

## Quick Start

### 1. Via Command Center UI

1. Navigate to `/agi/command-center`
2. Click **"Run Tests"** button to run all scenario tests
3. Click **"Run AGI Now"** to test with your real data
4. Inspect World Snapshot for identity/emotion/calendar/routines

### 2. Via API

```bash
# Run all tests
curl -X POST http://localhost:3000/api/agi/test-scenario \
  -H "Content-Type: application/json" \
  -d '{"runAll": true}'

# Test specific scenario
curl -X POST http://localhost:3000/api/agi/test-scenario \
  -H "Content-Type: application/json" \
  -d '{"scenario": "overload_day"}'

# Run real AGI
curl -X POST http://localhost:3000/api/agi/run \
  -H "Content-Type: application/json" \
  -d '{"trigger": {"type": "manual", "source": "test"}}'
```

### 3. Via Code

```typescript
import { runAllScenarioTests } from "@/lib/agi/testing/scenarios.test";

// Run all tests
const results = await runAllScenarioTests();
console.log("All passed:", results.allPassed);
```

---

## Test Scenarios

### `overload_day`
- **Setup:** 12+ calendar events, 8 overdue tasks, blocked items
- **Expected:** ExecutiveFunctionAgent flags overload, suggests triage/simplification
- **Check:** Actions reduce load, don't add complexity

### `procrastination`
- **Setup:** 5 tasks overdue 5-9 days (simulated rollovers)
- **Expected:** ExecAgent detects pattern, suggests breaking tasks down
- **Check:** Planner favors low-risk, atomic actions

### `identity_misaligned`
- **Setup:** Roles: ["Dad", "Founder"], Values: ["Family", "Health"], but only work tasks
- **Expected:** IdentityAgent flags neglected roles, proposes family/health time
- **Check:** Actions include role-balancing, not only work

### `rising_stress`
- **Setup:** Emotion: stressed, trend: rising, intensity: 0.85
- **Expected:** EmotionAgent proposes recovery, Planner penalizes complexity
- **Check:** Supportive nudges boosted, high-risk tasks down-ranked

### `ideal_day`
- **Setup:** Well-structured day, aligned identity, stable emotion
- **Expected:** AGI doesn't overreact
- **Check:** Minimal, supportive actions (≤5)

### `empty_state`
- **Setup:** Minimal data (empty arrays)
- **Expected:** No errors, graceful handling
- **Check:** No crashes, empty or minimal plan

---

## What to Look For

### ✅ Good Signs

- **Coherent reasoning:** Agent summaries make sense
- **Appropriate actions:** Match the scenario (overload → triage, stress → recovery)
- **Reasonable count:** 5-15 actions, not 50+
- **Identity-aware:** Actions respect roles/values
- **Emotion-aware:** Stressed state reduces complexity

### ❌ Red Flags

- **Random actions:** Don't match scenario context
- **Overreaction:** Ideal day gets 20+ corrective actions
- **Identity conflicts:** "Work 14 hours" when "Family" is core value
- **Missing data:** World Snapshot shows empty arrays when data exists
- **Errors:** Crashes, DB failures, missing fields

---

## Calibration Checklist

### Calendar Perception
- [ ] Client meetings scored 0.7-0.8 importance
- [ ] Deep work blocks classified correctly
- [ ] Personal events recognized
- [ ] Overload score matches reality (packed day = high score)

### Routine Discovery
- [ ] Best focus window matches actual focus times
- [ ] Avoidance window aligns with rescheduling patterns
- [ ] High-performance days match completion patterns

### Identity Agent
- [ ] Flags neglected roles (family/work balance)
- [ ] Addresses blindspots (task avoidance, relationship neglect)
- [ ] Leverages strengths appropriately

### Emotion Agent
- [ ] Detects rising stress trend
- [ ] Proposes recovery when stressed
- [ ] Doesn't spam when stable/happy

### Executive Function Agent
- [ ] Detects overload (>10 commitments)
- [ ] Spots procrastination (tasks overdue >3 days)
- [ ] Suggests deep work blocks appropriately

### Planner v2
- [ ] Stressed state → penalizes complexity
- [ ] Identity misalignment → boosts role-balancing actions
- [ ] Low-risk actions prioritized
- [ ] High-risk actions down-ranked

---

## Debugging Tips

### If actions feel random:

1. Check agent reasoning summaries in Command Center
2. Verify WorldState has real data (not all empty arrays)
3. Check Planner scoring logs (dev mode)
4. Verify agents are actually running (check agent count)

### If identity/emotion not showing:

1. Check `lib/agi/worldstate.ts` - verify identity/emotion fetching
2. Check database - do `identity_profiles` or `emo_states` have data?
3. Check fallback logic - are we falling back to defaults?

### If routines are wrong:

1. Check `lib/agi/perception/routines.ts` heuristics
2. Verify you have enough historical data (tasks/events)
3. Adjust scoring weights if patterns don't match reality

### If tests fail:

1. Check console logs for errors
2. Verify test scenarios build valid WorldState
3. Check that kernel accepts `worldStateOverride` parameter
4. Verify agents handle edge cases (empty arrays, null values)

---

## Next Steps

Once tests pass and calibration feels right:

1. **Test with real data** - Run AGI on your actual Pulse account
2. **Tune heuristics** - Adjust calendar/routine perception to match your patterns
3. **Validate actions** - Do the proposed actions feel right?
4. **Check feedback** - Use `agi_feedback` API to record what works/doesn't

Then proceed to Phase 3 (Monitoring + Autonomy) with confidence.



