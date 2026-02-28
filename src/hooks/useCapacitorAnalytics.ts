import { useEffect } from "react";
import { isNative, getPlatform } from "@/lib/capacitor";
import { analytics } from "@/lib/analytics/posthog";

/**
 * Tracks native app lifecycle events (resume / background).
 * Only activates on Capacitor (iOS/Android).
 * Mount once inside the Router context.
 */
export function useCapacitorAnalytics() {
  useEffect(() => {
    if (!isNative()) return;

    let listener: { remove: () => void } | undefined;

    const setup = async () => {
      try {
        const { App: CapApp } = await import("@capacitor/app");
        listener = await CapApp.addListener("appStateChange", (state) => {
          if (state.isActive) {
            analytics.track("App Resumed", {
              platform: getPlatform(),
              is_online: navigator.onLine,
            });
          } else {
            analytics.track("App Backgrounded", {
              platform: getPlatform(),
            });
          }
        });
      } catch {
        // @capacitor/app not available — safe to ignore
      }
    };

    void setup();
    return () => { listener?.remove(); };
  }, []);
}
