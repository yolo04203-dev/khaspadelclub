import { useEffect, Suspense, lazy } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useNavigate } from "react-router-dom";
import { Capacitor } from "@capacitor/core";
import { AuthProvider } from "@/contexts/AuthContext";
import { NotificationProvider } from "@/contexts/NotificationContext";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { LoadingScreen } from "@/components/ui/loading-screen";
import { OfflineBanner, SlowConnectionBanner } from "@/components/ui/error-state";
import { useNetworkStatus } from "@/hooks/useNetworkStatus";
import { useStatusBar } from "@/hooks/useStatusBar";
import { logger } from "@/lib/logger";
import { reportError } from "@/lib/errorReporting";

// Eager load critical pages
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import NotFound from "./pages/NotFound";

// Lazy load non-critical pages for better performance
const lazyImports = {
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

// Export for prefetching in AppHeader
export { lazyImports };

const Ladders = lazy(lazyImports.Ladders);
const LadderDetail = lazy(lazyImports.LadderDetail);
const LadderCreate = lazy(lazyImports.LadderCreate);
const LadderManage = lazy(lazyImports.LadderManage);
const CreateTeam = lazy(lazyImports.CreateTeam);
const Challenges = lazy(lazyImports.Challenges);
const FindOpponents = lazy(lazyImports.FindOpponents);
const Americano = lazy(lazyImports.Americano);
const AmericanoCreate = lazy(lazyImports.AmericanoCreate);
const AmericanoSession = lazy(lazyImports.AmericanoSession);
const Tournaments = lazy(lazyImports.Tournaments);
const TournamentCreate = lazy(lazyImports.TournamentCreate);
const TournamentDetail = lazy(lazyImports.TournamentDetail);
const Profile = lazy(lazyImports.Profile);
const Players = lazy(lazyImports.Players);
const PlayerProfile = lazy(lazyImports.PlayerProfile);
const Stats = lazy(lazyImports.Stats);
const Admin = lazy(lazyImports.Admin);
const Privacy = lazy(lazyImports.Privacy);
const Terms = lazy(lazyImports.Terms);
const Contact = lazy(lazyImports.Contact);

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

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    let appListener: { remove: () => void } | undefined;
    let resumeListener: { remove: () => void } | undefined;

    const setup = async () => {
      try {
        const { App: CapApp } = await import("@capacitor/app");

        // Deep link handler
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

        // Foreground resume — refetch active queries
        resumeListener = await CapApp.addListener("appStateChange", (state) => {
          if (state.isActive) {
            logger.debug("App resumed — refetching active queries");
            queryClient.refetchQueries({ type: "active", stale: true });
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
    };
  }, [navigate]);

  return null;
}

// Configure QueryClient with production-ready settings
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Retry failed queries 3 times with exponential backoff
      retry: 3,
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
      // Stale time: data is fresh for 2 minutes (navigations reuse cache)
      staleTime: 2 * 60 * 1000,
      // Cache time: keep unused data for 10 minutes
      gcTime: 10 * 60 * 1000,
      // Don't refetch on window focus in production for stability
      refetchOnWindowFocus: false,
    },
    mutations: {
      // Log mutation errors
      onError: (error) => {
        logger.error("Mutation failed", error);
      },
    },
  },
});

const App = () => {
  // Global error handlers for production stability
  useEffect(() => {
    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      logger.error("Unhandled promise rejection", event.reason, {
        type: "unhandledrejection",
      });
      reportError(event.reason, { type: "unhandledrejection" });
      event.preventDefault();
    };

    const handleError = (event: ErrorEvent) => {
      logger.error("Unhandled error", event.error, {
        type: "error",
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
      });
      reportError(event.error, { filename: event.filename, lineno: event.lineno });
      event.preventDefault();
    };

    // Handle Safari/iOS specific storage errors
    const handleStorageError = () => {
      logger.warn("Storage quota exceeded or unavailable", {
        type: "storage",
      });
    };

    window.addEventListener("unhandledrejection", handleUnhandledRejection);
    window.addEventListener("error", handleError);
    
    // Check storage availability on mount
    try {
      const testKey = "__storage_test__";
      localStorage.setItem(testKey, testKey);
      localStorage.removeItem(testKey);
    } catch (e) {
      handleStorageError();
    }

    return () => {
      window.removeEventListener("unhandledrejection", handleUnhandledRejection);
      window.removeEventListener("error", handleError);
    };
  }, []);

  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <NotificationProvider>
            <TooltipProvider>
              <Toaster />
              <Sonner />
              <BrowserRouter>
                <NativeLifecycleManager />
                <NetworkStatusProvider>
                  <Suspense fallback={<LoadingScreen message="Loading page..." />}>
                    <Routes>
                      {/* Critical routes - eagerly loaded */}
                      <Route path="/" element={<Index />} />
                      <Route path="/auth" element={<Auth />} />
                      <Route path="/dashboard" element={<Dashboard />} />
                      
                      {/* Lazy loaded routes */}
                      <Route path="/ladders" element={<Ladders />} />
                      <Route path="/ladders/create" element={<LadderCreate />} />
                      <Route path="/ladders/:id" element={<LadderDetail />} />
                      <Route path="/ladders/:id/manage" element={<LadderManage />} />
                      <Route path="/teams/create" element={<CreateTeam />} />
                      <Route path="/challenges" element={<Challenges />} />
                      <Route path="/find-opponents" element={<FindOpponents />} />
                      <Route path="/americano" element={<Americano />} />
                      <Route path="/americano/create" element={<AmericanoCreate />} />
                      <Route path="/americano/:id" element={<AmericanoSession />} />
                      <Route path="/tournaments" element={<Tournaments />} />
                      <Route path="/tournaments/create" element={<TournamentCreate />} />
                      <Route path="/tournaments/:id" element={<TournamentDetail />} />
                      <Route path="/profile" element={<Profile />} />
                      <Route path="/players" element={<Players />} />
                      <Route path="/players/:id" element={<PlayerProfile />} />
                      <Route path="/stats" element={<Stats />} />
                      <Route path="/admin" element={<Admin />} />
                      <Route path="/privacy" element={<Privacy />} />
                      <Route path="/terms" element={<Terms />} />
                      <Route path="/contact" element={<Contact />} />
                      
                      {/* Catch-all 404 route */}
                      <Route path="*" element={<NotFound />} />
                    </Routes>
                  </Suspense>
                </NetworkStatusProvider>
              </BrowserRouter>
            </TooltipProvider>
          </NotificationProvider>
        </AuthProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
};

export default App;
