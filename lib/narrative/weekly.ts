// Weekly Narrative Loop
// lib/narrative/weekly.ts

import { refreshLifeEventsForUser } from './events';
import { refreshLifeChaptersForUser } from './chapters';
import { refreshLifeThemesForUser } from './themes';
import { refreshIdentityArcsForUser } from './identity';
import { createWeeklyNarrativeSnapshotForUser } from './snapshots';

export async function runWeeklyNarrativeLoopForUser(userId: string, weekEnd: Date) {
  const from = new Date(weekEnd);
  from.setDate(from.getDate() - 14); // Look back 14 days for events

  // 1. Extract life events from recent activity
  await refreshLifeEventsForUser(userId, from, weekEnd);

  // 2. Segment into chapters
  await refreshLifeChaptersForUser(userId);

  // 3. Detect themes
  await refreshLifeThemesForUser(userId);

  // 4. Create identity arcs
  await refreshIdentityArcsForUser(userId);

  // 5. Create weekly snapshot
  await createWeeklyNarrativeSnapshotForUser(userId, weekEnd);
}


