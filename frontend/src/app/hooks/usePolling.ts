import { useEffect, useRef, useCallback } from 'react';

/**
 * usePolling – run callback every `interval` ms.
 * Stops when component unmounts or `enabled` is false.
 * Runs immediately on mount (no initial delay).
 */
export function usePolling(
  callback: () => Promise<void> | void,
  interval: number,
  enabled: boolean = true,
) {
  const savedCallback = useRef(callback);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    savedCallback.current = callback;
  }, [callback]);

  const stop = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (!enabled) { stop(); return; }

    // Run immediately
    savedCallback.current();

    timerRef.current = setInterval(() => {
      savedCallback.current();
    }, interval);

    return stop;
  }, [enabled, interval, stop]);
}