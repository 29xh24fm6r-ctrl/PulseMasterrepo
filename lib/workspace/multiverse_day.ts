// Conscious Workspace v1 - Daily Multiverse Quick Compare
// lib/workspace/multiverse_day.ts

import { DailyTimelineView } from './types';
import { generateDailyTimelineView } from './daily_projection';

export async function compareDailyTimelines(params: {
  userId: string;
  date: Date;
  timelineIds: string[];
}): Promise<DailyTimelineView[]> {
  const { userId, date, timelineIds } = params;

  const views: DailyTimelineView[] = [];

  for (const timelineId of timelineIds) {
    try {
      const view = await generateDailyTimelineView({
        userId,
        date,
        timelineId,
      });
      views.push(view);
    } catch (error) {
      console.error(`Failed to generate view for timeline ${timelineId}:`, error);
    }
  }

  return views;
}


