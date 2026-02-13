import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { initWebVitals } from "@/lib/webVitals";

initWebVitals();

// Defer Sentry to after first render to remove ~30KB from critical path
if ('requestIdleCallback' in window) {
  requestIdleCallback(() => import("@/lib/errorReporting").then(m => m.initErrorReporting()));
} else {
  setTimeout(() => import("@/lib/errorReporting").then(m => m.initErrorReporting()), 2000);
}

createRoot(document.getElementById("root")!).render(<App />);

// Register service worker for PWA support
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js").catch((err) => {
      console.warn("SW registration failed:", err);
    });
  });
}
