import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Logo } from "@/components/Logo";
import { Button } from "@/components/ui/button";

export function AdminHeader() {
  return (
    <header className="border-b border-border bg-card sticky top-0 z-40 safe-top">
      <div className="container flex items-center h-16">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link to="/dashboard">
              <ArrowLeft className="w-4 h-4" />
            </Link>
          </Button>
          <Logo size="sm" showImage={false} />
        </div>
      </div>
    </header>
  );
}
