import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { initWebVitals } from "@/lib/webVitals";
import { logger } from "@/lib/logger";

initWebVitals();

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
        console.warn("SW registration failed:", err);
      });
  });
}
