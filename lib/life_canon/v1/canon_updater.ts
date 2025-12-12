// Life Canon v1 - Canon Updater (Orchestrator)
// lib/life_canon/v1/canon_updater.ts

import { createLifeCanonSnapshotForUser } from './snapshot';

export async function refreshLifeCanonForUser(userId: string, now: Date) {
  return await createLifeCanonSnapshotForUser(userId, now);
}


