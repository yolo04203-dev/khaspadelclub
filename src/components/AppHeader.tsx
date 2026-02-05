import { Link } from "react-router-dom";
import { ArrowLeft, LogOut } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { Logo } from "@/components/Logo";
import { Button } from "@/components/ui/button";
import { NotificationBell } from "@/components/NotificationBell";

interface AppHeaderProps {
  showBack?: boolean;
  backTo?: string;
  actions?: React.ReactNode;
}

export function AppHeader({ showBack = false, backTo = "/dashboard", actions }: AppHeaderProps) {
  const { user, role, signOut } = useAuth();

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
  );
}
