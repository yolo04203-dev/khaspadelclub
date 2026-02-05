import { Link, useLocation } from "react-router-dom";
import { ArrowLeft, LogOut, Users, BarChart3, Swords, Layers, Home } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { Logo } from "@/components/Logo";
import { Button } from "@/components/ui/button";
import { NotificationBell } from "@/components/NotificationBell";
import { cn } from "@/lib/utils";

interface AppHeaderProps {
  showBack?: boolean;
  backTo?: string;
  actions?: React.ReactNode;
}

const navLinks = [
  { to: "/dashboard", label: "Home", icon: Home },
  { to: "/ladders", label: "Ladders", icon: Layers },
  { to: "/challenges", label: "Challenges", icon: Swords },
  { to: "/players", label: "Players", icon: Users },
  { to: "/stats", label: "Stats", icon: BarChart3 },
];

export function AppHeader({ showBack = false, backTo = "/dashboard", actions }: AppHeaderProps) {
  const { user, role, signOut } = useAuth();
  const location = useLocation();

  return (
    <header className="border-b border-border bg-card sticky top-0 z-40">
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
            <Logo size="sm" />
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

      {/* Mobile Navigation */}
      {user && (
        <nav className="md:hidden flex items-center justify-around border-t border-border bg-card py-2 px-2">
          {navLinks.map(({ to, label, icon: Icon }) => {
            const isActive = location.pathname === to || 
              (to !== "/dashboard" && location.pathname.startsWith(to));
            return (
              <Link
                key={to}
                to={to}
                className={cn(
                  "flex flex-col items-center gap-0.5 px-2 py-1 text-xs rounded-md transition-colors",
                  isActive
                    ? "text-accent"
                    : "text-muted-foreground"
                )}
              >
                <Icon className="w-5 h-5" />
                <span>{label}</span>
              </Link>
            );
          })}
        </nav>
      )}
    </header>
  );
}
