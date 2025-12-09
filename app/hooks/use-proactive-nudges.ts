"use client";

import { useState, useEffect, useCallback } from 'react';

interface ProactiveInsight {
  id: string;
  type: 'task' | 'deal' | 'follow_up' | 'habit' | 'identity';
  priority: 'high' | 'medium' | 'low';
  title: string;
  message: string;
  icon: string;
  action?: {
    label: string;
    href: string;
  };
  timestamp: string;
}

const IDENTITY_STATE_KEY = 'pulse-identity-state';
const AUTONOMY_SETTINGS_KEY = 'pulse-autonomy-settings';

interface UseProactiveNudgesOptions {
  pollInterval?: number; // ms, default 5 minutes
  enabled?: boolean;
}

export function useProactiveNudges(options: UseProactiveNudgesOptions = {}) {
  const { pollInterval = 5 * 60 * 1000, enabled = true } = options;
  
  const [insights, setInsights] = useState<ProactiveInsight[]>([]);
  const [loading, setLoading] = useState(false);
  const [suppressed, setSuppressed] = useState(false);
  const [lastFetch, setLastFetch] = useState<Date | null>(null);

  const fetchInsights = useCallback(async () => {
    if (!enabled) return;
    
    setLoading(true);
    try {
      // Get identity state and autonomy settings from localStorage
      let identityState = null;
      let settings = null;

      try {
        const savedIdentity = localStorage.getItem(IDENTITY_STATE_KEY);
        if (savedIdentity) identityState = JSON.parse(savedIdentity);
      } catch {}

      try {
        const savedSettings = localStorage.getItem(AUTONOMY_SETTINGS_KEY);
        if (savedSettings) settings = JSON.parse(savedSettings);
      } catch {}

      const res = await fetch('/api/cron/proactive', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ settings, identityState }),
      });

      const data = await res.json();

      if (data.suppressed) {
        setSuppressed(true);
        setInsights([]);
      } else if (data.ok) {
        setSuppressed(false);
        setInsights(data.insights || []);
      }

      setLastFetch(new Date());
    } catch (err) {
      console.error('Failed to fetch proactive insights:', err);
    } finally {
      setLoading(false);
    }
  }, [enabled]);

  // Initial fetch
  useEffect(() => {
    fetchInsights();
  }, [fetchInsights]);

  // Poll interval
  useEffect(() => {
    if (!enabled || pollInterval <= 0) return;

    const interval = setInterval(fetchInsights, pollInterval);
    return () => clearInterval(interval);
  }, [enabled, pollInterval, fetchInsights]);

  const dismissInsight = useCallback((id: string) => {
    setInsights(prev => prev.filter(i => i.id !== id));
  }, []);

  const refresh = useCallback(() => {
    fetchInsights();
  }, [fetchInsights]);

  return {
    insights,
    loading,
    suppressed,
    lastFetch,
    dismissInsight,
    refresh,
    highPriorityCount: insights.filter(i => i.priority === 'high').length,
  };
}

export default useProactiveNudges;
