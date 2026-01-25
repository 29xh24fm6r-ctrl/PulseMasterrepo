import { useState, useEffect } from 'react';
import { TimeHorizonState } from '../types/nerve-center';

// Mock data for development
const MOCK_TIME_HORIZON: TimeHorizonState = {
  currentLoad: 72,
  projectedLoad: {
    today: 72,
    tomorrow: 85,
    thisWeek: 78,
    nextWeek: 62,
  },
  criticalPath: [
    { label: 'Close Q1 contracts', time: '2h', impact: 'critical' },
    { label: 'Client presentation', time: 'tomorrow 9am', impact: 'high' },
    { label: 'Product v2 launch', time: '4 days', impact: 'high' },
  ],
  capacityForecast: {
    available: 45,
    allocated: 72,
    buffer: -27, // Overcommitted
  },
  recommendations: [
    'Clear 3 hours tomorrow morning for presentation prep',
    'Consider delegating routine tasks this week',
    'Block Friday afternoon for recovery time',
  ],
};

export function useTimeHorizon() {
  const [timeHorizon, setTimeHorizon] = useState<TimeHorizonState>(MOCK_TIME_HORIZON);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Simulate API call
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 500);

    return () => clearTimeout(timer);
  }, []);

  return { timeHorizon, isLoading };
}
