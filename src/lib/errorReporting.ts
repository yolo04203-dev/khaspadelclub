import * as Sentry from "@sentry/react";

const SENTRY_DSN = import.meta.env.VITE_SENTRY_DSN;

export function initErrorReporting() {
  if (!SENTRY_DSN) {
    console.warn("[ErrorReporting] No VITE_SENTRY_DSN configured, skipping Sentry init");
    return;
  }

  Sentry.init({
    dsn: SENTRY_DSN,
    environment: import.meta.env.MODE,
    integrations: [
      Sentry.browserTracingIntegration(),
      Sentry.replayIntegration({ maskAllText: false, blockAllMedia: false }),
    ],
    tracesSampleRate: 0.2,
    replaysSessionSampleRate: 0.1,
    replaysOnErrorSampleRate: 1.0,
    beforeSend(event) {
      if (
        event.exception?.values?.[0]?.stacktrace?.frames?.some(
          (f) => f.filename?.includes("extension://")
        )
      ) {
        return null;
      }
      return event;
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
