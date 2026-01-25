import { useState, useEffect } from 'react';
import { LifeState, Domain } from '../types/nerve-center';

// Mock data for development
const MOCK_LIFE_STATE: LifeState = {
  level: 'ELEVATED',
  score: 78,
  activeItems: 4,
  pendingDecisions: 2,
  inMotion: '$127K in motion',
  weekLoad: 72,
  weekLoadTrend: 12,
  updatedAt: new Date(),
};

const MOCK_DOMAINS: Domain[] = [
  {
    id: 'money',
    label: 'Money',
    icon: '💰',
    health: 85,
    status: 'thriving',
    metric: '+$2.4K',
    metricLabel: 'vs typical',
    activeThreads: 3,
    updatedAt: new Date(),
  },
  {
    id: 'work',
    label: 'Work',
    icon: '💼',
    health: 72,
    status: 'active',
    metric: '3 active',
    metricLabel: 'projects',
    activeThreads: 5,
    updatedAt: new Date(),
  },
  {
    id: 'health',
    label: 'Health',
    icon: '⚡',
    health: 65,
    status: 'attention',
    metric: '3 days',
    metricLabel: 'since gym',
    activeThreads: 1,
    updatedAt: new Date(),
  },
  {
    id: 'people',
    label: 'People',
    icon: '👥',
    health: 58,
    status: 'attention',
    metric: '2 owed',
    metricLabel: 'calls',
    activeThreads: 4,
    updatedAt: new Date(),
  },
  {
    id: 'mind',
    label: 'Mind',
    icon: '🧠',
    health: 80,
    status: 'thriving',
    metric: '5 days',
    metricLabel: 'streak',
    activeThreads: 2,
    updatedAt: new Date(),
  },
  {
    id: 'home',
    label: 'Home',
    icon: '🏠',
    health: 90,
    status: 'thriving',
    metric: 'Clear',
    metricLabel: 'no fires',
    activeThreads: 0,
    updatedAt: new Date(),
  },
];

export function useLifeState() {
  const [lifeState, setLifeState] = useState<LifeState>(MOCK_LIFE_STATE);
  const [domains, setDomains] = useState<Domain[]>(MOCK_DOMAINS);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Simulate API call
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 500);

    return () => clearTimeout(timer);
  }, []);

  return { lifeState, domains, isLoading };
}
