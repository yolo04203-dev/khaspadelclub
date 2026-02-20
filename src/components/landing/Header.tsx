import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Menu, X } from "lucide-react";
import { Logo } from "@/components/Logo";
import { Button } from "@/components/ui/button";
import { logger } from "@/lib/logger";

const navLinks = [
  { label: "Features", href: "#features" },
  { label: "Modes", href: "#sports-modes" },
];

export function Header() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const navigate = useNavigate();

  const handleNavigateToAuth = () => {
    setMobileMenuOpen(false);
    try {
      navigate("/auth");
    } catch (error) {
      logger.navigationError("/auth", error);
      window.location.href = "/auth";
    }
  };

  const handleNavigateHome = () => {
    try {
      navigate("/");
    } catch (error) {
      logger.navigationError("/", error);
      window.location.href = "/";
    }
  };

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-lg border-b border-border/50">
      <div className="container">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <button onClick={handleNavigateHome} className="focus:outline-none">
            <Logo size="lg" />
          </button>

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-8">
            {navLinks.map((link) => (
              <a
                key={link.label}
                href={link.href}
                className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
              >
                {link.label}
              </a>
            ))}
          </nav>

          {/* CTA buttons */}
          <div className="hidden md:flex items-center gap-4">
            <Button 
              className="bg-accent text-accent-foreground hover:bg-accent/90" 
              onClick={handleNavigateToAuth}
            >
              Get Started
            </Button>
          </div>

          {/* Mobile menu button */}
          <button
            className="md:hidden min-h-[44px] min-w-[44px] flex items-center justify-center -mr-2"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? (
              <X className="w-6 h-6" />
            ) : (
              <Menu className="w-6 h-6" />
            )}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      <div
        className={`md:hidden bg-background border-b border-border overflow-hidden transition-all duration-200 ${
          mobileMenuOpen ? "max-h-[400px] opacity-100" : "max-h-0 opacity-0 border-b-0"
        }`}
      >
        <div className="container py-4 space-y-4">
          {navLinks.map((link) => (
            <a
              key={link.label}
              href={link.href}
              className="block py-2 text-foreground font-medium"
              onClick={() => setMobileMenuOpen(false)}
            >
              {link.label}
            </a>
          ))}
          <div className="pt-4 space-y-2 border-t border-border">
            <Button 
              className="w-full bg-accent text-accent-foreground hover:bg-accent/90" 
              onClick={handleNavigateToAuth}
            >
              Get Started
            </Button>
          </div>
        </div>
      </div>
    </header>
  );
}