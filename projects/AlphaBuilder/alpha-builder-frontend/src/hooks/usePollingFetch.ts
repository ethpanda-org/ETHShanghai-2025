import { useCallback, useEffect, useRef, useState } from "react";

export interface UsePollingFetchOptions<TData> {
  url: string;
  intervalMs?: number | null;
  enabled?: boolean;
  parse?: (response: Response) => Promise<TData>;
  requestInit?: RequestInit;
}

export interface UsePollingFetchResult<TData> {
  data: TData | null;
  error: Error | null;
  loading: boolean;
  reload: () => Promise<void>;
}

/**
 * Generic polling hook that fetches data with optional interval refreshing.
 * It ensures requests are aborted on unmount and never updates state after unmount.
 */
export function usePollingFetch<TData>(
  options: UsePollingFetchOptions<TData>
): UsePollingFetchResult<TData> {
  const {
    url,
    intervalMs = 0,
    enabled = true,
    parse = (response: Response) => response.json() as Promise<TData>,
    requestInit,
  } = options;

  const [data, setData] = useState<TData | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  const isMountedRef = useRef(true);
  const controllerRef = useRef<AbortController | null>(null);
  const dataRef = useRef<TData | null>(null);
  const parseRef = useRef(parse);
  const requestInitRef = useRef<RequestInit | undefined>(requestInit);

  useEffect(() => {
    parseRef.current = parse;
  }, [parse]);

  useEffect(() => {
    requestInitRef.current = requestInit;
  }, [requestInit]);

  const fetchOnce = useCallback(async () => {
    if (!enabled) return;

    try {
      controllerRef.current?.abort();
      const controller = new AbortController();
      controllerRef.current = controller;

      if (isMountedRef.current) {
        if (!dataRef.current) {
          setLoading(true);
        }
      }

      const response = await fetch(url, {
        signal: controller.signal,
        ...(requestInitRef.current ?? {}),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const parsed = await parseRef.current(response);
      if (!isMountedRef.current) return;

      dataRef.current = parsed;
      setData(parsed);
      setError(null);
    } catch (err) {
      if (!isMountedRef.current) return;
      if ((err as any)?.name === "AbortError") return;
      setError(err as Error);
    } finally {
      if (isMountedRef.current) {
        setLoading(false);
      }
    }
  }, [enabled, url]);

  useEffect(() => {
    isMountedRef.current = true;

    if (!enabled) {
      setLoading(false);
      return () => {
        isMountedRef.current = false;
        controllerRef.current?.abort();
      };
    }

    fetchOnce();

    let intervalId: number | null = null;
    if (intervalMs && intervalMs > 0) {
      intervalId = window.setInterval(fetchOnce, intervalMs);
    }

    return () => {
      isMountedRef.current = false;
      controllerRef.current?.abort();
      if (intervalId !== null) {
        window.clearInterval(intervalId);
      }
    };
  }, [enabled, fetchOnce, intervalMs]);

  return { data, error, loading, reload: fetchOnce };
}
