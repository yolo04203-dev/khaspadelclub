import { useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import { Capacitor } from "@capacitor/core";
import { analytics } from "@/lib/analytics/posthog";

/** Route path → human-readable name */
function routeName(path: string): string {
  const segments = path.split("/").filter(Boolean);
  if (segments.length === 0) return "Home";
  return segments
    .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
    .join(" / ");
}

/**
 * Tracks SPA route changes as "Screen Viewed" events.
 * Deduplicates consecutive identical paths (React StrictMode, AnimatePresence).
 * Mount inside the Router context (e.g. AnimatedRoutes).
 */
export function useScreenTracking() {
  const location = useLocation();
  const lastPathRef = useRef<string | null>(null);

  useEffect(() => {
    const path = location.pathname;
    if (path === lastPathRef.current) return; // dedupe
    lastPathRef.current = path;

    analytics.screen(routeName(path), {
      path,
      platform: Capacitor.isNativePlatform() ? Capacitor.getPlatform() : "web",
    });
  }, [location.pathname]);
}
