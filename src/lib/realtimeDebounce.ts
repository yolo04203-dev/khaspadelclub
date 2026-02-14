/**
 * Debounced callback wrapper for Supabase realtime subscriptions.
 * Prevents query stampedes when multiple events arrive in rapid succession.
 */
export function createDebouncedCallback(
  callback: () => void,
  delay = 500
): () => void {
  let timer: ReturnType<typeof setTimeout> | null = null;

  return () => {
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => {
      timer = null;
      callback();
    }, delay);
  };
}
