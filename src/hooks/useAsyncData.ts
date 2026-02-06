import { useState, useEffect, useCallback, useRef } from "react";
import { logger } from "@/lib/logger";

export type AsyncState<T> = {
  data: T | null;
  isLoading: boolean;
  error: Error | null;
  isRefreshing: boolean;
};

interface UseAsyncDataOptions {
  retryCount?: number;
  retryDelay?: number;
  timeout?: number;
}

/**
 * Generic hook for async data fetching with loading, error, and retry states
 * Handles slow networks, timeouts, and provides retry functionality
 */
export function useAsyncData<T>(
  fetchFn: () => Promise<T>,
  deps: React.DependencyList = [],
  options: UseAsyncDataOptions = {}
): AsyncState<T> & { refetch: () => Promise<void>; retry: () => Promise<void> } {
  const { retryCount = 3, retryDelay = 1000, timeout = 30000 } = options;

  const [state, setState] = useState<AsyncState<T>>({
    data: null,
    isLoading: true,
    error: null,
    isRefreshing: false,
  });

  const isMountedRef = useRef(true);
  const attemptRef = useRef(0);

  const executeWithTimeout = useCallback(
    async (fn: () => Promise<T>): Promise<T> => {
      return new Promise((resolve, reject) => {
        const timeoutId = setTimeout(() => {
          reject(new Error("Request timed out. Please check your connection."));
        }, timeout);

        fn()
          .then((result) => {
            clearTimeout(timeoutId);
            resolve(result);
          })
          .catch((error) => {
            clearTimeout(timeoutId);
            reject(error);
          });
      });
    },
    [timeout]
  );

  const fetchData = useCallback(
    async (isRefresh = false) => {
      if (!isMountedRef.current) return;

      setState((prev) => ({
        ...prev,
        isLoading: !isRefresh,
        isRefreshing: isRefresh,
        error: null,
      }));

      attemptRef.current = 0;

      const attemptFetch = async (): Promise<void> => {
        try {
          const result = await executeWithTimeout(fetchFn);
          if (!isMountedRef.current) return;

          setState({
            data: result,
            isLoading: false,
            error: null,
            isRefreshing: false,
          });
        } catch (error) {
          attemptRef.current += 1;

          if (attemptRef.current < retryCount && isMountedRef.current) {
            logger.warn(`Fetch attempt ${attemptRef.current} failed, retrying...`, {
              error: error instanceof Error ? error.message : "Unknown error",
            });

            await new Promise((resolve) =>
              setTimeout(resolve, retryDelay * attemptRef.current)
            );

            if (isMountedRef.current) {
              return attemptFetch();
            }
          }

          if (!isMountedRef.current) return;

          const finalError =
            error instanceof Error ? error : new Error("An unexpected error occurred");

          logger.error("Fetch failed after retries", finalError);

          setState({
            data: null,
            isLoading: false,
            error: finalError,
            isRefreshing: false,
          });
        }
      };

      await attemptFetch();
    },
    [fetchFn, executeWithTimeout, retryCount, retryDelay]
  );

  useEffect(() => {
    isMountedRef.current = true;
    fetchData();

    return () => {
      isMountedRef.current = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  const refetch = useCallback(() => fetchData(true), [fetchData]);
  const retry = useCallback(() => fetchData(false), [fetchData]);

  return { ...state, refetch, retry };
}
