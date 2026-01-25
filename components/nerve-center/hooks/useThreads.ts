import { useState, useEffect } from 'react';
import { LifeThread } from '../types/nerve-center';

// Mock data for development
const MOCK_THREADS: LifeThread[] = [
  {
    id: 't1',
    title: 'Close Q1 revenue',
    domains: ['money', 'work'],
    health: 85,
    status: 'active',
    progress: 0.78,
    nextAction: 'Sign Acme contract',
    dueIn: '2 hours',
    storyLine: 'Three major deals converging. $127K waiting on final signatures.',
    itemCount: 5,
    lastActivity: '12 min ago',
  },
  {
    id: 't2',
    title: 'Launch product v2',
    domains: ['work'],
    health: 72,
    status: 'active',
    progress: 0.64,
    nextAction: 'Review staging deployment',
    dueIn: '4 days',
    storyLine: 'Beta feedback incorporated. Final polish before public launch.',
    itemCount: 12,
    lastActivity: '1 hour ago',
  },
  {
    id: 't3',
    title: 'Back to gym routine',
    domains: ['health'],
    health: 45,
    status: 'attention',
    progress: 0.2,
    nextAction: 'Book trainer session',
    dueIn: 'overdue',
    storyLine: '3 weeks off. Membership expiring. Time to commit.',
    itemCount: 3,
    lastActivity: '3 days ago',
  },
  {
    id: 't4',
    title: 'Mom\'s visit planning',
    domains: ['people', 'home'],
    health: 90,
    status: 'thriving',
    progress: 0.95,
    nextAction: 'Confirm airport pickup',
    dueIn: '6 days',
    storyLine: 'Room ready. Activities planned. Just logistics now.',
    itemCount: 8,
    lastActivity: '2 hours ago',
  },
  {
    id: 't5',
    title: 'Daily meditation practice',
    domains: ['mind'],
    health: 88,
    status: 'thriving',
    progress: 0.71,
    nextAction: 'Today\'s session',
    dueIn: '6pm today',
    storyLine: '5-day streak. Morning routine locked in.',
    itemCount: 1,
    lastActivity: '22 hours ago',
  },
];

export function useThreads() {
  const [threads, setThreads] = useState<LifeThread[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Simulate API call
    const timer = setTimeout(() => {
      setThreads(MOCK_THREADS);
      setIsLoading(false);
    }, 500);

    return () => clearTimeout(timer);
  }, []);

  return { threads, isLoading };
}
