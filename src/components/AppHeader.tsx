import { Link, useLocation } from "react-router-dom";
import { ArrowLeft, LogOut, BarChart3, Swords, Layers, Home, LayoutGrid } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { Logo } from "@/components/Logo";
import { Button } from "@/components/ui/button";
import { NotificationBell } from "@/components/NotificationBell";
import { cn } from "@/lib/utils";
import React, { useCallback } from "react";

interface AppHeaderProps {
  showBack?: boolean;
  backTo?: string;
  actions?: React.ReactNode;
}

// Map nav routes to their lazy import keys for prefetching
const prefetchMap: Record<string, string> = {
  "/ladders": "Ladders",
  "/challenges": "Challenges",
  "/tournaments": "Tournaments",
  "/stats": "Stats",
};

const navLinks = [
  { to: "/dashboard", label: "Home", icon: Home },
  { to: "/ladders", label: "Ladders", icon: Layers },
  { to: "/challenges", label: "Challenges", icon: Swords },
  { to: "/tournaments", label: "Tournaments", icon: LayoutGrid },
  { to: "/stats", label: "Stats", icon: BarChart3 },
];

export const AppHeader = React.memo(function AppHeader({ showBack = false, backTo = "/dashboard", actions }: AppHeaderProps) {
  const { user, role, signOut } = useAuth();
  const location = useLocation();

  const handlePrefetch = useCallback((to: string) => {
    const key = prefetchMap[to];
    if (key) {
      import("@/App").then(mod => {
        const imports = (mod as any).lazyImports;
        if (imports?.[key]) imports[key]();
      }).catch(() => {});
    }
  }, []);

  return (
    <>
      <header className="border-b border-border bg-card sticky top-0 z-40 safe-top">
        <div className="container flex items-center justify-between h-16">
          <div className="flex items-center gap-4">
            {showBack && (
              <Button variant="ghost" size="icon" asChild>
                <Link to={backTo}>
                  <ArrowLeft className="w-4 h-4" />
                </Link>
              </Button>
            )}
            <Link to={user ? "/dashboard" : "/"}>
              <Logo size="md" showText={!actions} className="sm:[&>span:last-child]:inline [&>span:last-child]:hidden" />
            </Link>

            {/* Navigation Links - Desktop */}
            {user && (
              <nav className="hidden md:flex items-center gap-1 ml-4">
                {navLinks.map(({ to, label, icon: Icon }) => {
                  const isActive = location.pathname === to || 
                    (to !== "/dashboard" && location.pathname.startsWith(to));
                  return (
                    <Link
                      key={to}
                      to={to}
                      onMouseEnter={() => handlePrefetch(to)}
                      onTouchStart={() => handlePrefetch(to)}
                      className={cn(
                        "flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-md transition-colors",
                        isActive
                          ? "bg-accent/10 text-accent"
                          : "text-muted-foreground hover:text-foreground hover:bg-muted"
                      )}
                    >
                      <Icon className="w-4 h-4" />
                      {label}
                    </Link>
                  );
                })}
              </nav>
            )}
          </div>

          <div className="flex items-center gap-2">
            {actions}
            
            {user && <NotificationBell />}

            <div className="text-right hidden sm:block ml-2">
              <p className="text-sm font-medium text-foreground">
                {user?.user_metadata?.display_name || user?.email?.split("@")[0]}
              </p>
              <p className="text-xs text-muted-foreground capitalize">{role || "Player"}</p>
            </div>

            <Button variant="ghost" size="icon" onClick={signOut}>
              <LogOut className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </header>

      {/* Mobile Navigation - Fixed bottom bar */}
      {user && (
        <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 flex items-center justify-around border-t border-border bg-card py-1.5 px-1 safe-bottom">
          {navLinks.map(({ to, label, icon: Icon }) => {
            const isActive = location.pathname === to || 
              (to !== "/dashboard" && location.pathname.startsWith(to));
            return (
              <Link
                key={to}
                to={to}
                onTouchStart={() => handlePrefetch(to)}
                className={cn(
                  "flex flex-col items-center justify-center min-w-0 flex-1 gap-0.5 py-1 text-[10px] leading-tight rounded-md transition-colors",
                  isActive
                    ? "text-accent"
                    : "text-muted-foreground"
                )}
              >
                <Icon className="w-5 h-5 shrink-0" />
                <span className="truncate max-w-full">{label}</span>
              </Link>
            );
          })}
        </nav>
      )}
    </>
  );
});
