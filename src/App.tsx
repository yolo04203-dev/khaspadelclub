import { useEffect, Suspense, lazy } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { NotificationProvider } from "@/contexts/NotificationContext";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { LoadingScreen } from "@/components/ui/loading-screen";
import { OfflineBanner, SlowConnectionBanner } from "@/components/ui/error-state";
import { useNetworkStatus } from "@/hooks/useNetworkStatus";
import { logger } from "@/lib/logger";

// Eager load critical pages
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import NotFound from "./pages/NotFound";

// Lazy load non-critical pages for better performance
const Ladders = lazy(() => import("./pages/Ladders"));
const LadderDetail = lazy(() => import("./pages/LadderDetail"));
const LadderCreate = lazy(() => import("./pages/LadderCreate"));
const LadderManage = lazy(() => import("./pages/LadderManage"));
const CreateTeam = lazy(() => import("./pages/CreateTeam"));
const Challenges = lazy(() => import("./pages/Challenges"));
const FindOpponents = lazy(() => import("./pages/FindOpponents"));
const Americano = lazy(() => import("./pages/Americano"));
const AmericanoCreate = lazy(() => import("./pages/AmericanoCreate"));
const AmericanoSession = lazy(() => import("./pages/AmericanoSession"));
const Tournaments = lazy(() => import("./pages/Tournaments"));
const TournamentCreate = lazy(() => import("./pages/TournamentCreate"));
const TournamentDetail = lazy(() => import("./pages/TournamentDetail"));
const Profile = lazy(() => import("./pages/Profile"));
const Players = lazy(() => import("./pages/Players"));
const PlayerProfile = lazy(() => import("./pages/PlayerProfile"));
const Stats = lazy(() => import("./pages/Stats"));
const Admin = lazy(() => import("./pages/Admin"));
const Privacy = lazy(() => import("./pages/Privacy"));
const Terms = lazy(() => import("./pages/Terms"));
const Contact = lazy(() => import("./pages/Contact"));

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
      // Prevent white screen by not crashing the app
      event.preventDefault();
    };

    const handleError = (event: ErrorEvent) => {
      logger.error("Unhandled error", event.error, {
        type: "error",
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
      });
      // Prevent default error handling that might cause white screen
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
