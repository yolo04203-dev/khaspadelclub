import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { logger } from "@/lib/logger";

// Render first, then initialize non-critical services
const deferInit = (fn: () => void) => {
  if ('requestIdleCallback' in window) {
    requestIdleCallback(fn);
  } else {
    setTimeout(fn, 2000);
  }
};

// Defer Sentry to after first render to remove ~30KB from critical path
if ('requestIdleCallback' in window) {
  requestIdleCallback(() => import("@/lib/errorReporting").then(m => m.initErrorReporting()));
} else {
  setTimeout(() => import("@/lib/errorReporting").then(m => m.initErrorReporting()), 2000);
}

// Global error handlers — catch errors outside React's tree
window.addEventListener("error", (event) => {
  logger.error(`Uncaught: ${event.message}`, event.error, {
    filename: event.filename,
    lineno: event.lineno,
    colno: event.colno,
  });
});

window.addEventListener("unhandledrejection", (event) => {
  const reason = event.reason;
  logger.error(
    `Unhandled rejection: ${reason?.message || String(reason)}`,
    reason instanceof Error ? reason : new Error(String(reason))
  );
});

createRoot(document.getElementById("root")!).render(<App />);

// Defer analytics and web-vitals to after first paint
deferInit(() => import("@/lib/webVitals").then(m => m.initWebVitals()));
deferInit(() => import("@/lib/analytics/posthog").then(m => m.analytics.init()));

// Register service worker for PWA support
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register("/sw.js")
      .then((registration) => {
        // Listen for new SW versions
        registration.addEventListener("updatefound", () => {
          const newWorker = registration.installing;
          if (!newWorker) return;
          newWorker.addEventListener("statechange", () => {
            if (newWorker.state === "installed" && navigator.serviceWorker.controller) {
              // New version available – prompt user
              if (confirm("A new version of Khas Padel Club is available. Reload to update?")) {
                window.location.reload();
              }
            }
          });
        });
      })
      .catch((err) => {
        logger.warn("SW registration failed", { error: String(err) });
      });
  });
}
