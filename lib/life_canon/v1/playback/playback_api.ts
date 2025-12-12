// Life Canon Playback v1 - Playback API Helpers
// lib/life_canon/v1/playback/playback_api.ts

import { getLifeTimelineForUser, getCurrentCanonSnapshot } from './timeline_query';

export async function getPlaybackOverview(userId: string) {
  const [timeline, snapshot] = await Promise.all([
    getLifeTimelineForUser(userId),
    getCurrentCanonSnapshot(userId),
  ]);

  return {
    snapshot,
    chapters: timeline.chapters,
    events: timeline.events,
    identityTransforms: timeline.transforms,
  };
}


