import { useState, useEffect, useCallback } from 'react';

export interface UseFetchOptions {
  enabled?: boolean;
  refetchInterval?: number;
}

export function useFetch<T>(
  fetchFn: () => Promise<T>,
  deps: React.DependencyList,
  options: UseFetchOptions = {}
) {
  const { enabled = true, refetchInterval } = options;
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const refetch = useCallback(async () => {
    if (!enabled) return;
    setLoading(true);
    setError(null);
    try {
      const result = await fetchFn();
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)));
    } finally {
      setLoading(false);
    }
  }, [enabled, ...deps]);

  useEffect(() => {
    if (!enabled) {
      setLoading(false);
      return;
    }
    refetch();
    if (refetchInterval != null && refetchInterval > 0) {
      const interval = setInterval(refetch, refetchInterval);
      return () => clearInterval(interval);
    }
  }, [enabled, refetchInterval, refetch]);

  return { data, loading, error, refetch };
}
