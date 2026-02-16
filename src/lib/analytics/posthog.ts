import { Capacitor } from "@capacitor/core";
import { logger } from "@/lib/logger";

// Sensitive property patterns to strip before sending
const SENSITIVE_PATTERNS = /token|password|authorization|secret|otp|credit_card|session_id|cookie/i;

let initialized = false;
let posthogInstance: any = null;

function getEnvironment(): string {
  if (import.meta.env.MODE === "development") return "development";
  if (window.location.hostname.includes("staging")) return "staging";
  return "production";
}

function getPlatform(): string {
  if (Capacitor.isNativePlatform()) return Capacitor.getPlatform(); // "ios" | "android"
  return "web";
}

function sanitizeProperties(properties: Record<string, any>): Record<string, any> {
  const cleaned: Record<string, any> = {};
  for (const [key, value] of Object.entries(properties)) {
    if (SENSITIVE_PATTERNS.test(key)) {
      cleaned[key] = "[REDACTED]";
    } else if (typeof value === "string" && SENSITIVE_PATTERNS.test(value)) {
      cleaned[key] = "[REDACTED]";
    } else {
      cleaned[key] = value;
    }
  }
  return cleaned;
}

function isEnabled(): boolean {
  const key = import.meta.env.VITE_POSTHOG_KEY;
  if (!key) return false;

  const env = getEnvironment();
  if (env === "development") {
    return import.meta.env.VITE_POSTHOG_DEV_ENABLED === "true";
  }
  return true; // staging + production
}

export const analytics = {
  /**
   * Initialize PostHog. Safe to call multiple times — only runs once.
   * Called in main.tsx before render.
   */
  async init() {
    if (initialized || !isEnabled()) return;
    initialized = true; // Guard before async import (StrictMode double-mount)

    try {
      const { default: posthog } = await import("posthog-js");
      posthogInstance = posthog;

      posthog.init(import.meta.env.VITE_POSTHOG_KEY, {
        api_host: import.meta.env.VITE_POSTHOG_HOST || "https://app.posthog.com",
        autocapture: true,
        capture_pageview: false, // We handle this manually via useScreenTracking
        capture_pageleave: true,
        disable_session_recording: false, // PostHog owns session replay
        session_recording: {
          maskAllInputs: true,
          maskTextSelector:
            "input[type=password], input[type=email], input[name*=otp], input[name*=pin], input[name*=card], input[name*=cvc], input[name*=phone]",
        } as any,
        sanitize_properties: (props: Record<string, any>) => sanitizeProperties(props),
        property_denylist: [
          "$current_url", // We send our own cleaned version
        ],
        loaded: () => {
          logger.debug("PostHog initialized", { env: getEnvironment(), platform: getPlatform() });
        },
      });

      // Track app opened on init
      this.track("App Opened", { platform: getPlatform() });
    } catch (error) {
      logger.warn("PostHog failed to load", { error });
      initialized = false; // Allow retry
    }
  },

  /**
   * Identify a logged-in user. Only sends safe traits.
   */
  identify(user: { id: string; role?: string | null; createdAt?: string }) {
    if (!posthogInstance) return;
    posthogInstance.identify(user.id, {
      role: user.role ?? "player",
      platform: getPlatform(),
      created_at: user.createdAt,
      app_version: typeof __APP_VERSION__ !== "undefined" ? __APP_VERSION__ : "unknown",
    });
  },

  /**
   * Track a named event with optional properties.
   */
  track(name: string, props?: Record<string, any>) {
    if (!posthogInstance) return;
    const safeProps = props ? sanitizeProperties(props) : {};
    posthogInstance.capture(name, {
      ...safeProps,
      platform: getPlatform(),
      app_version: typeof __APP_VERSION__ !== "undefined" ? __APP_VERSION__ : "unknown",
    });
  },

  /**
   * Track a screen/page view. Used by useScreenTracking.
   */
  screen(name: string, props?: Record<string, any>) {
    this.track("Screen Viewed", {
      screen_name: name,
      ...props,
    });
  },

  /**
   * Reset identity on logout. Generates new anonymous distinct_id.
   */
  reset() {
    if (!posthogInstance) return;
    posthogInstance.reset();
  },

  /**
   * Get current PostHog session ID for cross-linking with Sentry.
   */
  getSessionId(): string | undefined {
    return posthogInstance?.get_session_id?.();
  },

  /**
   * Get current PostHog distinct ID for cross-linking with Sentry.
   */
  getDistinctId(): string | undefined {
    return posthogInstance?.get_distinct_id?.();
  },
};
