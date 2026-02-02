import { Link } from "react-router-dom";
import { ArrowLeft, Shield } from "lucide-react";
import { Logo } from "@/components/Logo";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export function AdminHeader() {
  return (
    <header className="border-b border-border bg-card sticky top-0 z-40">
      <div className="container flex items-center justify-between h-16">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link to="/dashboard">
              <ArrowLeft className="w-4 h-4" />
            </Link>
          </Button>
          <Logo size="sm" />
        </div>
        <Badge variant="default" className="bg-accent text-accent-foreground gap-1.5">
          <Shield className="w-3 h-3" />
          Admin Portal
        </Badge>
      </div>
    </header>
  );
}
