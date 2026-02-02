import { Link } from "react-router-dom";
import { Logo } from "@/components/Logo";

export function Footer() {
  const scrollToSection = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <footer className="bg-primary text-primary-foreground py-16">
      <div className="container">
        <div className="grid md:grid-cols-4 gap-12">
          {/* Brand */}
          <div className="md:col-span-2">
            <Logo size="md" className="mb-4" />
            <p className="text-primary-foreground/70 max-w-sm mb-6">
              The ultimate competition platform for paddle sports academies. 
              Track, compete, and grow together.
            </p>
            <p className="text-sm text-primary-foreground/50">
              © {new Date().getFullYear()} Paddle Leaderboard. All rights reserved.
            </p>
          </div>

          {/* Links */}
          <div>
            <h4 className="font-display font-semibold mb-4">Platform</h4>
            <ul className="space-y-3 text-sm text-primary-foreground/70">
              <li>
                <button onClick={() => scrollToSection("features")} className="hover:text-primary-foreground transition-colors">
                  Features
                </button>
              </li>
              <li>
                <button onClick={() => scrollToSection("sports-modes")} className="hover:text-primary-foreground transition-colors">
                  Sports Modes
                </button>
              </li>
              <li>
                <Link to="/leaderboard" className="hover:text-primary-foreground transition-colors">
                  Live Demo
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="font-display font-semibold mb-4">Support</h4>
            <ul className="space-y-3 text-sm text-primary-foreground/70">
              <li>
                <Link to="/contact" className="hover:text-primary-foreground transition-colors">
                  Help Center
                </Link>
              </li>
              <li>
                <Link to="/contact" className="hover:text-primary-foreground transition-colors">
                  Contact
                </Link>
              </li>
              <li>
                <Link to="/privacy" className="hover:text-primary-foreground transition-colors">
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link to="/terms" className="hover:text-primary-foreground transition-colors">
                  Terms of Service
                </Link>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </footer>
  );
}
