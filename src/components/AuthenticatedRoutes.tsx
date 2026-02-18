import { Suspense } from "react";
import { Routes, Route, useLocation } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { NotificationProvider } from "@/contexts/NotificationContext";
import { LoadingScreen } from "@/components/ui/loading-screen";
import { useScreenTracking } from "@/hooks/useScreenTracking";
import { lazyWithRetry } from "@/lib/lazyWithRetry";
import NotFound from "@/pages/NotFound";

// All authenticated routes are lazy-loaded
const Dashboard = lazyWithRetry(() => import("@/pages/Dashboard"));
const Ladders = lazyWithRetry(() => import("@/pages/Ladders"));
const LadderDetail = lazyWithRetry(() => import("@/pages/LadderDetail"));
const LadderCreate = lazyWithRetry(() => import("@/pages/LadderCreate"));
const LadderManage = lazyWithRetry(() => import("@/pages/LadderManage"));
const CreateTeam = lazyWithRetry(() => import("@/pages/CreateTeam"));
const Challenges = lazyWithRetry(() => import("@/pages/Challenges"));
const FindOpponents = lazyWithRetry(() => import("@/pages/FindOpponents"));
const Americano = lazyWithRetry(() => import("@/pages/Americano"));
const AmericanoCreate = lazyWithRetry(() => import("@/pages/AmericanoCreate"));
const AmericanoSession = lazyWithRetry(() => import("@/pages/AmericanoSession"));
const Tournaments = lazyWithRetry(() => import("@/pages/Tournaments"));
const TournamentCreate = lazyWithRetry(() => import("@/pages/TournamentCreate"));
const TournamentDetail = lazyWithRetry(() => import("@/pages/TournamentDetail"));
const Profile = lazyWithRetry(() => import("@/pages/Profile"));
const Players = lazyWithRetry(() => import("@/pages/Players"));
const PlayerProfile = lazyWithRetry(() => import("@/pages/PlayerProfile"));
const Stats = lazyWithRetry(() => import("@/pages/Stats"));
const Admin = lazyWithRetry(() => import("@/pages/Admin"));

function AuthenticatedAnimatedRoutes() {
  useScreenTracking();
  return (
    <Suspense fallback={<LoadingScreen message="Loading page..." />}>
      <Routes>
        <Route path="/dashboard" element={<Dashboard />} />
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
        <Route path="*" element={<NotFound />} />
      </Routes>
    </Suspense>
  );
}

export default function AuthenticatedRoutes() {
  return (
    <AuthProvider>
      <NotificationProvider>
        <AuthenticatedAnimatedRoutes />
      </NotificationProvider>
    </AuthProvider>
  );
}
