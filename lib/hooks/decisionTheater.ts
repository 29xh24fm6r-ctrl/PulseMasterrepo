// Decision Theater - React Hooks
// lib/hooks/decisionTheater.ts

import { useState, useEffect } from 'react';

interface CouncilSession {
  session: any;
  consensus: any;
  opinions: Array<{
    memberRoleId: string;
    displayName: string;
    stance: string;
    confidence: number;
    recommendation: string;
    rationale: {
      upside?: string[];
      risks?: string[];
      keyFactors?: string[];
    };
    suggestedConditions?: string[];
  }>;
}

export function useCouncilSession(sessionId: string | null) {
  const [data, setData] = useState<CouncilSession | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!sessionId) {
      setData(null);
      return;
    }

    setLoading(true);
    setError(null);

    fetch(`/api/council/session/${sessionId}`)
      .then((res) => {
        if (!res.ok) throw new Error('Failed to fetch session');
        return res.json();
      })
      .then((data) => {
        setData(data);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  }, [sessionId]);

  return { session: data?.session, consensus: data?.consensus, opinions: data?.opinions ?? [], loading, error };
}

export function useDossiers() {
  const [dossiers, setDossiers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);

    fetch('/api/council/dossiers')
      .then((res) => {
        if (!res.ok) throw new Error('Failed to fetch dossiers');
        return res.json();
      })
      .then((data) => {
        setDossiers(data.dossiers ?? []);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  }, []);

  return { dossiers, loading, error };
}

export function useStartCouncilSession() {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const startSession = async (params: {
    topic: string;
    question: string;
    timescale?: string;
    importance?: number;
    context?: any;
  }) => {
    setPending(true);
    setError(null);

    try {
      const res = await fetch('/api/council/session/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to start council session');
      }

      const data = await res.json();
      setPending(false);
      return data;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start session');
      setPending(false);
      throw err;
    }
  };

  return { startSession, pending, error };
}

export function useCreateDossier() {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createDossier = async (params: {
    sessionId: string;
    decisionLabel: string;
    userChoice: string;
    userNotes?: string;
  }) => {
    setPending(true);
    setError(null);

    try {
      const res = await fetch('/api/council/dossier', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to create dossier');
      }

      const data = await res.json();
      setPending(false);
      return data;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create dossier');
      setPending(false);
      throw err;
    }
  };

  return { createDossier, pending, error };
}


