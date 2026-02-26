let cached: Promise<typeof import("@sentry/react") | null> | null = null;

export function getSentry() {
  if (!cached) {
    cached = import("@sentry/react").catch(() => null);
  }
  return cached;
}
