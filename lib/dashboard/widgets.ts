export function getWidgetsForProfile(profile: any): string[] {
  const widgets: string[] = ['guidance_stream'];
  const density = profile?.preferences?.dashboardDensity || 0.5;
  const industry = profile?.role?.industry?.toLowerCase() || '';
  const gamification = profile?.preferences?.gamification;
  
  // Lending/Sales widgets
  if (industry.includes('mortgage') || industry.includes('real_estate') || industry.includes('sales') || industry.includes('lending') || industry.includes('loan') || industry.includes('banking')) {
    widgets.push('pipeline_snapshot', 'follow_up_radar');
  }
  
  // Core widgets
  widgets.push('tasks_today', 'calendar_today');
  
  // Gamification for those who love it
  if (gamification?.overall === 'love' || gamification?.xp) {
    widgets.push('xp_progress');
  }
  if (gamification?.streaks) {
    widgets.push('streak_tracker');
  }
  
  // More widgets for high density
  if (density >= 0.5) widgets.push('upcoming_week');
  if (density >= 0.7) widgets.push('habits_today');
  
  widgets.push('quick_capture');
  return widgets;
}

export const LAYOUT_PRESETS: Record<string, string[]> = {
  'balanced': ['guidance_stream', 'tasks_today', 'calendar_today', 'quick_capture'],
};
