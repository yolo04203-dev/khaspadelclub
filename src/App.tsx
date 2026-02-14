import { useEffect, Suspense, lazy, ComponentType } from "react";
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
import { PerfOverlay } from "@/components/dev/PerfOverlay";
import { Button } from "@/components/ui/button";
import { RefreshCw } from "lucide-react";

// Eager load critical pages
import Index from "./pages/Index";
import Auth from "./pages/Auth";

import NotFound from "./pages/NotFound";

// Chunk-load error fallback
function ChunkErrorFallback() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 p-6 text-center">
      <h2 className="text-lg font-semibold text-foreground">Failed to load page</h2>
      <p className="text-sm text-muted-foreground max-w-sm">
        This can happen on slow connections or after an app update. Please reload to try again.
      </p>
      <Button onClick={() => window.location.reload()} variant="outline">
        <RefreshCw className="w-4 h-4 mr-2" />
        Reload
      </Button>
    </div>
  );
}

// Lazy loader with one retry before showing fallback
function lazyWithRetry(importFn: () => Promise<{ default: ComponentType<any> }>) {
  return lazy(() =>
    importFn().catch(() =>
      new Promise<{ default: ComponentType<any> }>((resolve) =>
        setTimeout(() => {
          importFn()
            .then(resolve)
            .catch(() => resolve({ default: ChunkErrorFallback }));
        }, 1500)
      )
    )
  );
}

// Lazy load non-critical pages for better performance
const lazyImports = {
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

// Export for prefetching in AppHeader
export { lazyImports };

const Dashboard = lazyWithRetry(lazyImports.Dashboard);
const Ladders = lazyWithRetry(lazyImports.Ladders);
const LadderDetail = lazyWithRetry(lazyImports.LadderDetail);
const LadderCreate = lazyWithRetry(lazyImports.LadderCreate);
const LadderManage = lazyWithRetry(lazyImports.LadderManage);
const CreateTeam = lazyWithRetry(lazyImports.CreateTeam);
const Challenges = lazyWithRetry(lazyImports.Challenges);
const FindOpponents = lazyWithRetry(lazyImports.FindOpponents);
const Americano = lazyWithRetry(lazyImports.Americano);
const AmericanoCreate = lazyWithRetry(lazyImports.AmericanoCreate);
const AmericanoSession = lazyWithRetry(lazyImports.AmericanoSession);
const Tournaments = lazyWithRetry(lazyImports.Tournaments);
const TournamentCreate = lazyWithRetry(lazyImports.TournamentCreate);
const TournamentDetail = lazyWithRetry(lazyImports.TournamentDetail);
const Profile = lazyWithRetry(lazyImports.Profile);
const Players = lazyWithRetry(lazyImports.Players);
const PlayerProfile = lazyWithRetry(lazyImports.PlayerProfile);
const Stats = lazyWithRetry(lazyImports.Stats);
const Admin = lazyWithRetry(lazyImports.Admin);
const Privacy = lazyWithRetry(lazyImports.Privacy);
const Terms = lazyWithRetry(lazyImports.Terms);
const Contact = lazyWithRetry(lazyImports.Contact);

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
    let backListener: { remove: () => void } | undefined;

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

        // Android hardware back button
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
  // Storage availability check (global error handlers are in main.tsx)
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
      {import.meta.env.DEV && <PerfOverlay />}
    </ErrorBoundary>
  );
};

export default App;
