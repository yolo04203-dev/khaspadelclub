import { useEffect, Suspense } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useNavigate } from "react-router-dom";
import { Capacitor } from "@capacitor/core";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { LoadingScreen } from "@/components/ui/loading-screen";
import { OfflineBanner, SlowConnectionBanner } from "@/components/ui/error-state";
import { useNetworkStatus } from "@/hooks/useNetworkStatus";
import { useStatusBar } from "@/hooks/useStatusBar";
import { logger } from "@/lib/logger";
import { PerfOverlay } from "@/components/dev/PerfOverlay";
import { useCapacitorAnalytics } from "@/hooks/useCapacitorAnalytics";
import { lazyWithRetry } from "@/lib/lazyWithRetry";
import { AuthProvider } from "@/contexts/AuthContext";

// Eager load only the landing page — everything else is lazy
import Index from "./pages/Index";

// Public pages that don't need auth (lazy)
const Auth = lazyWithRetry(() => import("./pages/Auth"));
const Privacy = lazyWithRetry(() => import("./pages/Privacy"));
const Terms = lazyWithRetry(() => import("./pages/Terms"));
const Contact = lazyWithRetry(() => import("./pages/Contact"));

// Authenticated shell (AuthProvider + NotificationProvider + all protected routes)
const AuthenticatedRoutes = lazyWithRetry(() => import("./components/AuthenticatedRoutes"));

// Lazy imports map for prefetching in AppHeader
export const lazyImports = {
  Dashboard: () => import("./pages/Dashboard"),
  Ladders: () => import("./pages/Ladders"),
  LadderDetail: () => import("./pages/LadderDetail"),
  LadderCreate: () => import("./pages/LadderCreate"),
  LadderManage: () => import("./pages/LadderManage"),
  CreateTeam: () => import("./pages/CreateTeam"),
  Challenges: () => import("./pages/Challenges"),
  FindOpponents: () => import("./pages/FindOpponents"),
  Americano: () => import("./pages/Americano"),
  AmericanoCreate: () => import("./pages/AmericanoCreate"),
  AmericanoSession: () => import("./pages/AmericanoSession"),
  Tournaments: () => import("./pages/Tournaments"),
  TournamentCreate: () => import("./pages/TournamentCreate"),
  TournamentDetail: () => import("./pages/TournamentDetail"),
  Profile: () => import("./pages/Profile"),
  Players: () => import("./pages/Players"),
  PlayerProfile: () => import("./pages/PlayerProfile"),
  Stats: () => import("./pages/Stats"),
  Admin: () => import("./pages/Admin"),
  Privacy: () => import("./pages/Privacy"),
  Terms: () => import("./pages/Terms"),
  Contact: () => import("./pages/Contact"),
};

// Network status wrapper component
function NetworkStatusProvider({ children }: { children: React.ReactNode }) {
  const { isOnline, isSlowConnection } = useNetworkStatus();

  return (
    <>
      <OfflineBanner isVisible={!isOnline} />
      <SlowConnectionBanner isVisible={isOnline && isSlowConnection} />
      <div className={!isOnline ? "pt-8" : isSlowConnection ? "pt-8" : ""}>
        {children}
      </div>
    </>
  );
}

/** Handles Capacitor deep links and foreground resume inside Router context */
function NativeLifecycleManager() {
  const navigate = useNavigate();
  useStatusBar();
  useCapacitorAnalytics();

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    let appListener: { remove: () => void } | undefined;
    let resumeListener: { remove: () => void } | undefined;
    let backListener: { remove: () => void } | undefined;

    const setup = async () => {
      try {
        const { App: CapApp } = await import("@capacitor/app");

        appListener = await CapApp.addListener("appUrlOpen", (event) => {
          try {
            const url = new URL(event.url);
            const path = url.pathname + url.search + url.hash;
            if (path && path !== "/") {
              logger.debug("Deep link received", { path });
              navigate(path, { replace: true });
            }
          } catch (e) {
            logger.warn("Failed to parse deep link", { url: event.url });
          }
        });

        resumeListener = await CapApp.addListener("appStateChange", (state) => {
          if (state.isActive) {
            logger.debug("App resumed — refetching active queries");
            queryClient.refetchQueries({ type: "active", stale: true });
          }
        });

        backListener = await CapApp.addListener("backButton", ({ canGoBack }) => {
          if (canGoBack) {
            navigate(-1);
          } else {
            CapApp.exitApp();
          }
        });
      } catch {
        // @capacitor/app not installed — safe to ignore on web
      }
    };

    void setup();

    return () => {
      appListener?.remove();
      resumeListener?.remove();
      backListener?.remove();
    };
  }, [navigate]);

  return null;
}

// Configure QueryClient with production-ready settings
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 3,
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
      staleTime: 2 * 60 * 1000,
      gcTime: 10 * 60 * 1000,
      refetchOnWindowFocus: false,
    },
    mutations: {
      onError: (error) => {
        logger.error("Mutation failed", error);
      },
    },
  },
});

const App = () => {
  useEffect(() => {
    try {
      const testKey = "__storage_test__";
      localStorage.setItem(testKey, testKey);
      localStorage.removeItem(testKey);
    } catch {
      logger.warn("Storage quota exceeded or unavailable", { type: "storage" });
    }
  }, []);

  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <NativeLifecycleManager />
            <NetworkStatusProvider>
              <Suspense fallback={<LoadingScreen message="Loading..." />}>
                <Routes>
                  {/* Public routes — no AuthProvider, no NotificationProvider */}
                  <Route path="/" element={<Index />} />
                  <Route path="/auth" element={<AuthProvider><Auth /></AuthProvider>} />
                  <Route path="/privacy" element={<Privacy />} />
                  <Route path="/terms" element={<Terms />} />
                  <Route path="/contact" element={<Contact />} />
                  {/* All other routes go through AuthProvider + NotificationProvider */}
                  <Route path="/*" element={<AuthenticatedRoutes />} />
                </Routes>
              </Suspense>
            </NetworkStatusProvider>
          </BrowserRouter>
        </TooltipProvider>
      </QueryClientProvider>
      {import.meta.env.DEV && <PerfOverlay />}
    </ErrorBoundary>
  );
};

export default App;
