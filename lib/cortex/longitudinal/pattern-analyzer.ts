// Longitudinal Pattern Analyzer
// lib/cortex/longitudinal/pattern-analyzer.ts

import { LifeEvent, LifePattern } from "./types";

/**
 * Analyze longitudinal patterns from events
 */
export function analyzeLongitudinalPatterns(events: LifeEvent[]): LifePattern[] {
  const patterns: LifePattern[] = [];

  // Sort chronologically
  const sortedEvents = [...events].sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  );

  // Detect different pattern types
  patterns.push(...detectProcrastinationCycles(sortedEvents));
  patterns.push(...detectBurnoutCycles(sortedEvents));
  patterns.push(...detectRelationshipRhythm(sortedEvents));
  patterns.push(...detectProductivityArcs(sortedEvents));
  patterns.push(...detectFinancialStressWindows(sortedEvents));
  patterns.push(...detectHabitBursts(sortedEvents));
  patterns.push(...detectEmotionCycles(sortedEvents));

  return patterns;
}

/**
 * Detect procrastination cycles
 */
function detectProcrastinationCycles(events: LifeEvent[]): LifePattern[] {
  const patterns: LifePattern[] = [];

  // Look for patterns: task_created → task_delayed → task_completed (with gaps)
  const taskEvents = events.filter(
    (e) => e.type === "task_created" || e.type === "task_delayed" || e.type === "task_completed"
  );

  let delayCount = 0;
  let cycleStart: Date | null = null;

  for (let i = 0; i < taskEvents.length; i++) {
    const event = taskEvents[i];
    if (event.type === "task_delayed") {
      if (!cycleStart) cycleStart = new Date(event.timestamp);
      delayCount++;
    } else if (event.type === "task_completed" && delayCount > 0) {
      if (delayCount >= 3) {
        // Pattern detected
        patterns.push({
          id: `procrastination_${patterns.length + 1}`,
          type: "procrastination_cycle",
          description: `Procrastination cycle: ${delayCount} tasks delayed before completion`,
          strength: Math.min(1.0, delayCount / 10),
          startDate: cycleStart!.toISOString(),
          endDate: event.timestamp,
          metadata: { delayCount },
        });
      }
      delayCount = 0;
      cycleStart = null;
    }
  }

  return patterns;
}

/**
 * Detect burnout cycles
 */
function detectBurnoutCycles(events: LifeEvent[]): LifePattern[] {
  const patterns: LifePattern[] = [];

  // Look for: high_stress → low_productivity → recovery
  const stressEvents = events.filter(
    (e) => e.emotion === "stressed" || e.emotion === "overwhelmed" || e.emotion === "burned_out"
  );

  let stressPeriods: Array<{ start: Date; end: Date; intensity: number }> = [];
  let currentPeriod: { start: Date; intensity: number } | null = null;

  for (const event of stressEvents) {
    if (event.intensity && event.intensity > 0.7) {
      if (!currentPeriod) {
        currentPeriod = {
          start: new Date(event.timestamp),
          intensity: event.intensity,
        };
      }
    } else if (currentPeriod) {
      stressPeriods.push({
        ...currentPeriod,
        end: new Date(event.timestamp),
      });
      currentPeriod = null;
    }
  }

  // Find cycles: stress period → recovery → stress period (repeating)
  for (let i = 0; i < stressPeriods.length - 1; i++) {
    const period1 = stressPeriods[i];
    const period2 = stressPeriods[i + 1];
    const gap = period2.start.getTime() - period1.end.getTime();
    const gapDays = gap / (1000 * 60 * 60 * 24);

    if (gapDays < 30 && gapDays > 7) {
      // Potential cycle (recurring stress with recovery)
      patterns.push({
        id: `burnout_cycle_${patterns.length + 1}`,
        type: "burnout_cycle",
        description: `Recurring stress cycles with ${Math.round(gapDays)}-day recovery periods`,
        frequency: `${Math.round(gapDays)} days`,
        strength: (period1.intensity + period2.intensity) / 2,
        startDate: period1.start.toISOString(),
        endDate: period2.end.toISOString(),
        metadata: { gapDays, cycleCount: 2 },
      });
    }
  }

  return patterns;
}

/**
 * Detect relationship rhythm
 */
function detectRelationshipRhythm(events: LifeEvent[]): LifePattern[] {
  const patterns: LifePattern[] = [];

  const relationshipEvents = events.filter((e) => e.domain === "relationships");

  if (relationshipEvents.length < 5) return patterns;

  // Calculate average time between interactions
  const intervals: number[] = [];
  for (let i = 1; i < relationshipEvents.length; i++) {
    const interval =
      new Date(relationshipEvents[i].timestamp).getTime() -
      new Date(relationshipEvents[i - 1].timestamp).getTime();
    intervals.push(interval / (1000 * 60 * 60 * 24)); // Convert to days
  }

  const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;

  if (avgInterval > 0 && avgInterval < 30) {
    patterns.push({
      id: "relationship_rhythm",
      type: "relationship_rhythm",
      description: `Regular relationship interactions every ${Math.round(avgInterval)} days on average`,
      frequency: `${Math.round(avgInterval)} days`,
      strength: 1.0 - Math.min(1.0, avgInterval / 30), // Stronger if more frequent
      startDate: relationshipEvents[0].timestamp,
      endDate: relationshipEvents[relationshipEvents.length - 1].timestamp,
      metadata: { avgInterval, eventCount: relationshipEvents.length },
    });
  }

  return patterns;
}

/**
 * Detect productivity arcs
 */
function detectProductivityArcs(events: LifeEvent[]): LifePattern[] {
  const patterns: LifePattern[] = [];

  const productivityEvents = events.filter(
    (e) =>
      e.type === "task_completed" ||
      e.type === "focus_session_completed" ||
      e.type === "project_milestone"
  );

  // Group by week and count productivity events
  const weeklyCounts = new Map<string, number>();
  for (const event of productivityEvents) {
    const week = getWeekKey(new Date(event.timestamp));
    weeklyCounts.set(week, (weeklyCounts.get(week) || 0) + 1);
  }

  // Find arcs: increasing → peak → decreasing
  const weeks = Array.from(weeklyCounts.keys()).sort();
  if (weeks.length < 3) return patterns;

  let arcStart = 0;
  let peakWeek = 0;
  let peakValue = 0;

  for (let i = 1; i < weeks.length - 1; i++) {
    const prev = weeklyCounts.get(weeks[i - 1]) || 0;
    const curr = weeklyCounts.get(weeks[i]) || 0;
    const next = weeklyCounts.get(weeks[i + 1]) || 0;

    if (curr > prev && curr > next && curr > peakValue) {
      peakValue = curr;
      peakWeek = i;
    }
  }

  if (peakValue > 5) {
    // Significant productivity arc
    patterns.push({
      id: "productivity_arc",
      type: "productivity_arc",
      description: `Productivity arc peaking at ${peakValue} events/week`,
      strength: Math.min(1.0, peakValue / 20),
      startDate: new Date(weeks[arcStart]).toISOString(),
      endDate: new Date(weeks[weeks.length - 1]).toISOString(),
      metadata: { peakValue, peakWeek: weeks[peakWeek] },
    });
  }

  return patterns;
}

/**
 * Detect financial stress windows
 */
function detectFinancialStressWindows(events: LifeEvent[]): LifePattern[] {
  const patterns: LifePattern[] = [];

  const financeEvents = events.filter((e) => e.domain === "finance");
  const stressEvents = events.filter(
    (e) => e.emotion === "stressed" || e.emotion === "anxious"
  );

  // Find periods where finance events + stress events overlap
  for (const financeEvent of financeEvents) {
    const nearbyStress = stressEvents.filter((e) => {
      const timeDiff = Math.abs(
        new Date(e.timestamp).getTime() - new Date(financeEvent.timestamp).getTime()
      );
      return timeDiff < 7 * 24 * 60 * 60 * 1000; // Within 7 days
    });

    if (nearbyStress.length >= 2) {
      patterns.push({
        id: `financial_stress_${patterns.length + 1}`,
        type: "financial_stress_window",
        description: `Financial stress period around ${financeEvent.type}`,
        strength: Math.min(1.0, nearbyStress.length / 5),
        startDate: financeEvent.timestamp,
        endDate: nearbyStress[nearbyStress.length - 1].timestamp,
        metadata: { financeEventType: financeEvent.type, stressCount: nearbyStress.length },
      });
    }
  }

  return patterns;
}

/**
 * Detect habit bursts
 */
function detectHabitBursts(events: LifeEvent[]): LifePattern[] {
  const patterns: LifePattern[] = [];

  const habitEvents = events.filter((e) => e.type === "habit_completed");

  // Group by week
  const weeklyHabits = new Map<string, number>();
  for (const event of habitEvents) {
    const week = getWeekKey(new Date(event.timestamp));
    weeklyHabits.set(week, (weeklyHabits.get(week) || 0) + 1);
  }

  // Find bursts: sudden increase in habit completion
  const weeks = Array.from(weeklyHabits.keys()).sort();
  for (let i = 1; i < weeks.length; i++) {
    const prev = weeklyHabits.get(weeks[i - 1]) || 0;
    const curr = weeklyHabits.get(weeks[i]) || 0;

    if (curr > prev * 2 && curr > 5) {
      // Habit burst detected
      patterns.push({
        id: `habit_burst_${patterns.length + 1}`,
        type: "habit_burst",
        description: `Habit completion burst: ${prev} → ${curr} completions/week`,
        strength: Math.min(1.0, curr / 20),
        startDate: new Date(weeks[i]).toISOString(),
        metadata: { prevCount: prev, burstCount: curr },
      });
    }
  }

  return patterns;
}

/**
 * Detect emotion cycles
 */
function detectEmotionCycles(events: LifeEvent[]): LifePattern[] {
  const patterns: LifePattern[] = [];

  const emotionEvents = events.filter((e) => e.emotion && e.intensity);

  if (emotionEvents.length < 10) return patterns;

  // Group by emotion type and find cycles
  const emotionGroups = new Map<string, LifeEvent[]>();
  for (const event of emotionEvents) {
    if (event.emotion) {
      const group = emotionGroups.get(event.emotion) || [];
      group.push(event);
      emotionGroups.set(event.emotion, group);
    }
  }

  // Find recurring emotions
  for (const [emotion, group] of emotionGroups.entries()) {
    if (group.length >= 5) {
      const intervals: number[] = [];
      for (let i = 1; i < group.length; i++) {
        const interval =
          new Date(group[i].timestamp).getTime() -
          new Date(group[i - 1].timestamp).getTime();
        intervals.push(interval / (1000 * 60 * 60 * 24));
      }

      const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;
      const variance =
        intervals.reduce((sum, i) => sum + Math.pow(i - avgInterval, 2), 0) /
        intervals.length;

      // Low variance = regular cycle
      if (variance < avgInterval * 0.5 && avgInterval > 0) {
        patterns.push({
          id: `emotion_cycle_${emotion}`,
          type: "emotion_cycle",
          description: `Recurring ${emotion} cycles every ${Math.round(avgInterval)} days`,
          frequency: `${Math.round(avgInterval)} days`,
          strength: 1.0 - Math.min(1.0, variance / avgInterval),
          startDate: group[0].timestamp,
          endDate: group[group.length - 1].timestamp,
          metadata: { emotion, avgInterval, variance },
        });
      }
    }
  }

  return patterns;
}

/**
 * Get week key for grouping (YYYY-WW format)
 */
function getWeekKey(date: Date): string {
  const year = date.getFullYear();
  const week = getWeekNumber(date);
  return `${year}-W${week.toString().padStart(2, "0")}`;
}

/**
 * Get ISO week number
 */
function getWeekNumber(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
}



