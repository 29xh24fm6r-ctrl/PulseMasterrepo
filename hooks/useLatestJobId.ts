import { useEffect, useState } from "react";

type EntityType = "deal" | "contact" | "upload";

export function useLatestJobId({
  entityType,
  entityId,
  pollMs = 10000,
}: {
  entityType: EntityType;
  entityId: string | null;
  pollMs?: number;
}) {
  const [jobId, setJobId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!entityId) {
      setJobId(null);
      setLoading(false);
      return;
    }

    let alive = true;

    async function fetchJob() {
      try {
        setLoading(true);
        const param = `${entityType}_id`;
        const r = await fetch(`/api/jobs/by-entity?${param}=${encodeURIComponent(entityId)}`);
        const j = await r.json();
        if (!alive) return;
        setJobId(j?.job_id ?? null);
      } catch (e) {
        console.error("Failed to fetch latest job:", e);
        if (alive) setJobId(null);
      } finally {
        if (alive) setLoading(false);
      }
    }

    fetchJob();

    // Poll at specified interval
    const interval = setInterval(fetchJob, pollMs);

    return () => {
      alive = false;
      clearInterval(interval);
    };
  }, [entityType, entityId, pollMs]);

  return { jobId, loading };
}

