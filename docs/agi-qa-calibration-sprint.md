# AGI Kernel v1.5 — QA, Calibration & Hardening Sprint

> **Status:** Ready for Claude to execute
> **Goal:** Test, debug, and calibrate Phase 1 + Phase 2 AGI work before expanding autonomy

---

## 0. Repo Recon (Quick Verification)

**Verify these exist and compile:**

- ✅ `lib/agi/worldstate.ts` - Enhanced with identity v3, emotion trends, calendar/routine perception
- ✅ `lib/agi/agents/identityAgent.ts` - v2 with alignment checking
- ✅ `lib/agi/agents/emotionAgent.ts` - v2 with trend detection
- ✅ `lib/agi/agents/executiveFunctionAgent.ts` - New agent for overload/procrastination
- ✅ `lib/agi/perception/calendar.ts` - Calendar event/day feature analysis
- ✅ `lib/agi/perception/routines.ts` - Routine discovery engine
- ✅ `lib/agi/planner.ts` - Multi-factor scoring (v2)
- ✅ `lib/agi/orchestrator.ts` - Chief of Staff entry point
- ✅ `app/(authenticated)/agi/command-center/page.tsx` - UI with test button

**Verify SQL tables:**

- ✅ `agi_runs`, `agi_actions`, `user_agi_settings`, `agi_policies`, `agi_feedback`

---

## 1. Test Harness Created ✅

**Files created:**

- `lib/agi/testing/harness.ts` - Synthetic scenario builder
- `lib/agi/testing/scenarios.test.ts` - Test functions
- `app/api/agi/test-scenario/route.ts` - Test API endpoint

**Scenarios available:**

- `overload_day` - Packed calendar + overdue tasks
- `procrastination` - Tasks repeatedly rolled forward
- `identity_misaligned` - Neglected family/health roles
- `rising_stress` - Stress trend rising
- `ideal_day` - Well-structured day (shouldn't overreact)
- `empty_state` - Minimal data (graceful handling)

**Test functions:**

- `testPlannerWithStressedEmotion()` - Verify planner penalizes complexity when stressed
- `testIdentityMisalignment()` - Verify IdentityAgent flags role neglect
- `testExecutiveFunctionOverload()` - Verify ExecAgent detects overload
- `testEmotionRisingStress()` - Verify EmotionAgent proposes recovery

**Usage:**

```bash
# Run all tests
curl -X POST http://localhost:3000/api/agi/test-scenario \
  -H "Content-Type: application/json" \
  -d '{"runAll": true}'

# Run specific scenario
curl -X POST http://localhost:3000/api/agi/test-scenario \
  -H "Content-Type: application/json" \
  -d '{"scenario": "overload_day"}'
```

---

## 2. Enhanced Logging ✅

**Added structured logging in:**

- `lib/agi/kernel.ts` - Logs agent runs, action counts, final plan
- `lib/agi/orchestrator.ts` - Logs execution decisions
- `lib/agi/planner.ts` - (Already has scoring details)

**Log format:**

```
[AGI Kernel] Running 8 agents...
[AGI Kernel][IdentityAgent] 3 action(s), confidence: 0.70, reasoning: Checking alignment with 2 role(s)...
[AGI Kernel] Total actions proposed: 15
[AGI Kernel][Planner] Selected 8 action(s) from 15 proposed
```

**Enable in development:**

Logs automatically appear when `NODE_ENV === "development"`.

---

## 3. Command Center UI Enhancements ✅

**Added:**

- "Run Tests" button - Executes all scenario tests
- Enhanced World Snapshot display:
  - Identity section (roles, priorities, archetype, strengths, blindspots)
  - Emotion section (state, trend, intensity)
  - Day Features (overload, fragmentation, opportunity blocks)
  - Routines (best focus window, avoidance window, high-performance days)
- Full JSON still available in collapsible section

**How to test:**

1. Navigate to `/agi/command-center`
2. Click "Run AGI Now" - inspect World Snapshot for new fields
3. Click "Run Tests" - check console for test results
4. Verify identity/emotion/routines show up correctly

---

## 4. Safety Guardrails Review ✅

**Executor (`lib/agi/executor.ts`):**

- ✅ `isActionAllowed()` checks risk level and dangerous types
- ✅ Hard safety rule comment added: "Do not send emails or move money from AGI actions in v1"
- ✅ Only internal tasks/insights/nudges allowed for auto-execution

**Orchestrator (`lib/agi/orchestrator.ts`):**

- ✅ `assist` mode: Actions logged as planned, NOT executed
- ✅ `autopilot` mode: Only `riskLevel: 'low'` actions auto-execute
- ✅ Logging added for execution decisions

**Verification checklist:**

- [ ] No `send_email` actions execute (only drafts)
- [ ] No `transfer_money` actions exist
- [ ] No `delete_data` or destructive actions
- [ ] High-risk actions always require confirmation
- [ ] `assist` mode never auto-executes

---

## 5. Manual Testing Checklist

### A. Smoke Test via Command Center

**Steps:**

1. Go to `/agi/command-center`
2. Ensure `user_agi_settings.level = 'assist'` (check DB or create default)
3. Click "Run AGI Now" multiple times
4. Inspect each run:

**World Snapshot checks:**

- [ ] Identity: roles/values show up (not empty arrays)
- [ ] Emotion: state/trend present (or null if no data)
- [ ] Calendar: dayFeatures populated (overloadScore, fragmentationScore)
- [ ] Routines: routineProfile present (bestFocusWindow, avoidanceWindow)

**Agent Reasoning checks:**

- [ ] IdentityAgent mentions roles/values in reasoning
- [ ] EmotionAgent references stress/trend (not just "none")
- [ ] ExecutiveFunctionAgent talks about overload/procrastination/blocked items
- [ ] Reasoning summaries are coherent (not gibberish)

**Final Plan checks:**

- [ ] Actions feel coherent (not random)
- [ ] Overloaded days → triage/simplification actions
- [ ] Focus blocks land in real best-focus windows (if routines detected)
- [ ] Recommendations don't fight identity (e.g., not "work 14 hours" when "Family" is core value)
- [ ] Action count reasonable (5-15, not 50+)

### B. Scenario Testing

**1. Overload Scenario:**

- Seed: Pack calendar with 12+ back-to-back events, add 8 overdue tasks
- Expected:
  - ExecutiveFunctionAgent flags overload & fragmentation
  - Butler/Exec actions propose triage and simplifying, not "more"
  - Planner down-ranks actions that add complexity

**2. Procrastination Scenario:**

- Seed: Take 3 tasks, roll them forward 5-9 days
- Expected:
  - Exec Agent calls out procrastination pattern
  - Planner favors smaller, atomic steps over big scary ones
  - Actions include "break into steps" or "triage session"

**3. Identity Misalignment:**

- Seed: Roles: ["Dad", "Founder"], Values: ["Family", "Health"], but calendar has only work
- Expected:
  - IdentityAgent flags neglected roles
  - Actions include: schedule family time, health blocks
  - NOT only revenue/work tasks

**4. Routine Check:**

- Seed: Real behavior data (1-2 weeks of events/tasks)
- Expected:
  - `bestFocusWindow` roughly matches when you actually focus
  - `avoidanceWindow` near your "doomscroll" or low-energy times
  - If patterns are wrong, adjust heuristics in `routines.ts`

**5. Rising Stress:**

- Seed: Emotion state = "stressed", trend = "rising", intensity = 0.85
- Expected:
  - EmotionAgent proposes recovery actions
  - Planner penalizes high-complexity actions
  - Supportive nudges boosted

**6. Ideal Day:**

- Seed: Well-structured day, aligned identity, stable emotion
- Expected:
  - AGI doesn't overreact
  - No unnecessary simplification or triage
  - Actions are supportive, not corrective

---

## 6. Calibration Passes Needed

### Calendar Perception (`lib/agi/perception/calendar.ts`)

**Verify classification:**

- [ ] Client meetings → `category: "meeting"`, `importanceScore: 0.7-0.8`
- [ ] Deep work blocks → `category: "deep_work"`, `energyRequirement: "high"`
- [ ] Admin tasks → `category: "shallow_work"`, `energyRequirement: "low"`
- [ ] Personal/family events → `category: "personal"`, `emotionalLoad: "low"`

**Adjust heuristics if:**

- Important meetings scored too low
- Deep work blocks misclassified as meetings
- Personal time not recognized

### Routine Discovery (`lib/agi/perception/routines.ts`)

**Verify inference:**

- [ ] `bestFocusWindow` matches actual focus times (check your real data)
- [ ] `avoidanceWindow` aligns with when tasks get rescheduled
- [ ] `highPerformanceDays` match days you complete most tasks

**Adjust heuristics if:**

- Focus window is way off (e.g., says 2am-5am when you focus 9am-12pm)
- Avoidance window doesn't match procrastination patterns
- High-performance days don't align with reality

**How to adjust:**

1. Check `lib/agi/perception/routines.ts` line ~80-120 (hour analysis)
2. Adjust scoring weights or time windows
3. Add more data sources (e.g., focus session logs if available)

---

## 7. Known Issues & Fixes Needed

### Issue: Kernel doesn't accept test worldstate

**Current:** `runAGIKernel` always calls `buildWorldState(userId)`

**Fix needed:** Add optional `worldStateOverride` parameter:

```ts
export async function runAGIKernel(
  userId: AGIUserId,
  trigger: AGITriggerContext,
  opts?: { worldStateOverride?: WorldState }
): Promise<AGIRunResult> {
  const world: WorldState = opts?.worldStateOverride || await buildWorldState(userId);
  // ... rest of kernel
}
```

Then update `harness.ts` to pass worldstate directly.

### Issue: Test scenarios don't actually run kernel

**Current:** `runAGITestScenario` builds worldstate but doesn't call kernel

**Fix needed:** Update to actually call `runAGIKernel` with test worldstate (after above fix).

---

## 8. Success Criteria

**This sprint is DONE when:**

- [ ] Test harness runs all scenarios without errors
- [ ] Command Center shows identity/emotion/calendar/routines in World Snapshot
- [ ] Logs show few, high-quality actions (not noisy floods)
- [ ] No runtime errors in `agi_runs`, `agi_actions`, `agi_feedback` tables
- [ ] Overload scenario → triage actions (not "add more")
- [ ] Procrastination scenario → breakdown actions (not "just do it")
- [ ] Identity misalignment → role-balancing actions
- [ ] Rising stress → recovery actions (not complexity)
- [ ] Ideal day → minimal, supportive actions (not overreaction)
- [ ] Calendar/routine heuristics match real user patterns (for Matt's data)

---

## 9. Next Steps After Calibration

Once Phase 1 + Phase 2 are calibrated:

1. **Complete Phase 2** - Enhance Email v3, Finance v2, Relationship v2 perception
2. **Phase 3** - Build monitoring daemon and long-horizon planning
3. **Phase 4** - Expand agent mesh to 12-20 agents
4. **Phase 5** - Self-optimization and emergent behavior

**But first:** Make sure the brain works correctly before giving it more autonomy.

---

## 10. Quick Test Commands

```bash
# Run all scenario tests
curl -X POST http://localhost:3000/api/agi/test-scenario \
  -H "Content-Type: application/json" \
  -d '{"runAll": true}'

# Test overload scenario
curl -X POST http://localhost:3000/api/agi/test-scenario \
  -H "Content-Type: application/json" \
  -d '{"scenario": "overload_day"}'

# Run real AGI
curl -X POST http://localhost:3000/api/agi/run \
  -H "Content-Type: application/json" \
  -d '{"trigger": {"type": "manual", "source": "test"}}'
```

---

**End of QA Sprint Spec**



