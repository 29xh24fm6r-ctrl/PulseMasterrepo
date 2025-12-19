import { useEffect, useState } from "react";
import { apiGet, ApiResponse } from "@/lib/api/client";

interface UsePulseQueryOptions {
  enabled?: boolean;
  refetchInterval?: number;
}

export function usePulseQuery<T>(
  url: string | null,
  options: UsePulseQueryOptions = {}
): {
  data: T | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
} {
  const { enabled = true, refetchInterval } = options;

  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    if (!url || !enabled) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const response = await apiGet<T>(url);
      if (response.ok) {
        setData(response.data);
      } else {
        setError(response.error);
        setData(null);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();

    let interval: NodeJS.Timeout | null = null;
    if (refetchInterval && refetchInterval > 0) {
      interval = setInterval(fetchData, refetchInterval);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [url, enabled, refetchInterval]);

  return {
    data,
    loading,
    error,
    refetch: fetchData,
  };
}

