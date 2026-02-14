import * as Sentry from "@sentry/react";

declare const __APP_VERSION__: string;

const SENTRY_DSN = import.meta.env.VITE_SENTRY_DSN;

const SENSITIVE_KEYS = /authorization|cookie|token|password|secret|credential|api[_-]?key/i;
const PII_KEYS = /email|phone|ssn|address|birth/i;
const BOT_UA = /bot|crawl|spider|slurp|facebookexternalhit|baiduspider|yandex/i;

function scrubObject(obj: Record<string, unknown>): Record<string, unknown> {
  const cleaned: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (SENSITIVE_KEYS.test(key) || PII_KEYS.test(key)) {
      cleaned[key] = "[Filtered]";
    } else if (typeof value === "object" && value !== null && !Array.isArray(value)) {
      cleaned[key] = scrubObject(value as Record<string, unknown>);
    } else {
      cleaned[key] = value;
    }
  }
  return cleaned;
}

function redactQueryParams(url: string): string {
  try {
    const parsed = new URL(url, window.location.origin);
    const sensitiveParams = ["token", "access_token", "refresh_token", "key", "api_key", "code"];
    for (const param of sensitiveParams) {
      if (parsed.searchParams.has(param)) {
        parsed.searchParams.set(param, "[Filtered]");
      }
    }
    return parsed.toString();
  } catch {
    return url;
  }
}

export function initErrorReporting() {
  if (!SENTRY_DSN) {
    console.warn("[ErrorReporting] No VITE_SENTRY_DSN configured, skipping Sentry init");
    return;
  }

  const appVersion = typeof __APP_VERSION__ !== "undefined" ? __APP_VERSION__ : "unknown";

  Sentry.init({
    dsn: SENTRY_DSN,
    environment: import.meta.env.MODE,
    release: `khas-padel@${appVersion}`,
    integrations: [
      Sentry.browserTracingIntegration(),
      Sentry.replayIntegration({ maskAllText: true, blockAllMedia: true }),
    ],
    tracesSampleRate: 0.2,
    replaysSessionSampleRate: 0.1,
    replaysOnErrorSampleRate: 1.0,

    beforeSend(event) {
      // Drop bot events
      const ua = event.request?.headers?.["User-Agent"] || navigator.userAgent;
      if (BOT_UA.test(ua)) return null;

      // Drop browser extension errors
      if (
        event.exception?.values?.[0]?.stacktrace?.frames?.some(
          (f) => f.filename?.includes("extension://")
        )
      ) {
        return null;
      }

      // Scrub request headers
      if (event.request?.headers) {
        event.request.headers = scrubObject(event.request.headers) as Record<string, string>;
      }

      // Scrub request data/body
      if (event.request?.data && typeof event.request.data === "object") {
        event.request.data = scrubObject(event.request.data as Record<string, unknown>);
      }

      // Scrub breadcrumb data
      if (event.breadcrumbs) {
        for (const bc of event.breadcrumbs) {
          if (bc.data && typeof bc.data === "object") {
            bc.data = scrubObject(bc.data as Record<string, unknown>);
          }
          if (bc.data?.url && typeof bc.data.url === "string") {
            bc.data.url = redactQueryParams(bc.data.url);
          }
        }
      }

      return event;
    },

    beforeBreadcrumb(breadcrumb) {
      // Redact sensitive URLs in navigation/http breadcrumbs
      if (breadcrumb.data?.url && typeof breadcrumb.data.url === "string") {
        breadcrumb.data.url = redactQueryParams(breadcrumb.data.url);
      }
      if (breadcrumb.data?.from && typeof breadcrumb.data.from === "string") {
        breadcrumb.data.from = redactQueryParams(breadcrumb.data.from);
      }
      if (breadcrumb.data?.to && typeof breadcrumb.data.to === "string") {
        breadcrumb.data.to = redactQueryParams(breadcrumb.data.to);
      }
      return breadcrumb;
    },
  });
}

export function reportError(error: unknown, context?: Record<string, unknown>) {
  const err = error instanceof Error ? error : new Error(String(error));
  Sentry.captureException(err, { extra: context });
}

export function setErrorReportingUser(user: { id: string; email?: string }) {
  Sentry.setUser({ id: user.id, email: user.email });
}

export function clearErrorReportingUser() {
  Sentry.setUser(null);
}

export function reportApiError(
  operation: string,
  error: unknown,
  context?: { status?: number; endpoint?: string }
) {
  reportError(error, { operation, ...context });
}

/** Send a test message to verify Sentry pipeline */
export function sendTestError() {
  Sentry.captureMessage("Test error from admin panel", "error");
}
