import { useState, useEffect } from 'react';
import { PriorityItem } from '../types/nerve-center';

// Mock data for development
const MOCK_PRIORITIES: PriorityItem[] = [
  {
    id: '1',
    type: 'decision',
    title: 'Close Q1 contracts',
    urgency: 'high',
    impact: 'critical',
    domain: 'money',
    dueIn: '2 hours',
    context: '$127K waiting on signature',
    actionLabel: 'Review & Sign',
    estimatedMinutes: 15,
  },
  {
    id: '2',
    type: 'action',
    title: 'Client presentation deck',
    urgency: 'medium',
    impact: 'high',
    domain: 'work',
    dueIn: 'tomorrow 9am',
    context: 'Slides 80% done',
    actionLabel: 'Finish slides',
    estimatedMinutes: 45,
  },
  {
    id: '3',
    type: 'response',
    title: 'Mom\'s birthday call',
    urgency: 'medium',
    impact: 'medium',
    domain: 'people',
    dueIn: 'today',
    context: 'Promised to call',
    actionLabel: 'Call now',
    estimatedMinutes: 30,
  },
  {
    id: '4',
    type: 'decision',
    title: 'Gym membership renewal',
    urgency: 'low',
    impact: 'medium',
    domain: 'health',
    dueIn: '3 days',
    context: 'Annual plan vs monthly',
    actionLabel: 'Choose plan',
    estimatedMinutes: 10,
  },
];

export function usePriorities() {
  const [priorities, setPriorities] = useState<PriorityItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Simulate API call
    const timer = setTimeout(() => {
      setPriorities(MOCK_PRIORITIES);
      setIsLoading(false);
    }, 500);

    return () => clearTimeout(timer);
  }, []);

  return { priorities, isLoading };
}
