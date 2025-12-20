"use client";

import { useEffect, useMemo, useState } from "react";

export type FocusLock = {
  id: string;
  user_id: string;
  status: "active" | "ended" | "expired";
  started_at: string;
  ends_at: string;
  minutes: number;
  playbook_title?: string | null;
  playbook_do?: string | null;
};

export function useFocusLock(pollMs: number = 15000) {
  const [lock, setLock] = useState<FocusLock | null>(null);
  const [loading, setLoading] = useState(true);

  async function refresh() {
    try {
      const r = await fetch("/api/focus-lock/active", { method: "GET" });
      const j = await r.json();
      setLock(j?.lock ?? null);
    } catch {
      // fail open
      setLock(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refresh();
    const t = setInterval(refresh, pollMs);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pollMs]);

  const secondsLeft = useMemo(() => {
    if (!lock) return 0;
    const ms = new Date(lock.ends_at).getTime() - Date.now();
    return Math.max(0, Math.floor(ms / 1000));
  }, [lock]);

  return { lock, loading, secondsLeft, refresh };
}

