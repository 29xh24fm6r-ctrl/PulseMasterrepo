import { useState, useEffect } from 'react';
import { PulseMindState } from '../types/nerve-center';

// Mock data for development
const MOCK_PULSE_MIND: PulseMindState = {
  currentActivity: 'SEEING',
  activityDetail: 'Scanning your calendar for conflicts...',
  confidence: 0.92,
  recentActions: [
    { type: 'SEEING', description: 'Detected schedule conflict tomorrow 2pm', timestamp: new Date(Date.now() - 5 * 60000) },
    { type: 'DOING', description: 'Auto-rescheduled dentist to Thursday', timestamp: new Date(Date.now() - 12 * 60000) },
    { type: 'REMEMBERING', description: 'Added context: Last visit was 6mo checkup', timestamp: new Date(Date.now() - 15 * 60000) },
  ],
  activeProcesses: 3,
  queuedTasks: 7,
};

export function usePulseMind() {
  const [pulseMind, setPulseMind] = useState<PulseMindState>(MOCK_PULSE_MIND);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Simulate API call
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 500);

    // Simulate activity updates every 8 seconds
    const activityTimer = setInterval(() => {
      setPulseMind((prev) => {
        const activities: Array<'SEEING' | 'DOING' | 'REMEMBERING'> = ['SEEING', 'DOING', 'REMEMBERING'];
        const details = {
          SEEING: [
            'Scanning your calendar for conflicts...',
            'Monitoring email for urgent requests...',
            'Analyzing spending patterns this week...',
          ],
          DOING: [
            'Auto-rescheduling dentist to Thursday...',
            'Drafting response to client email...',
            'Updating project timeline...',
          ],
          REMEMBERING: [
            'Added context: Last visit was 6mo checkup',
            'Recalled: Similar request handled 2 weeks ago',
            'Updated: Client prefers morning meetings',
          ],
        };

        const newActivity = activities[Math.floor(Math.random() * activities.length)];
        const detailOptions = details[newActivity];
        const newDetail = detailOptions[Math.floor(Math.random() * detailOptions.length)];

        return {
          ...prev,
          currentActivity: newActivity,
          activityDetail: newDetail,
          confidence: 0.85 + Math.random() * 0.15,
        };
      });
    }, 8000);

    return () => {
      clearTimeout(timer);
      clearInterval(activityTimer);
    };
  }, []);

  return { pulseMind, isLoading };
}
