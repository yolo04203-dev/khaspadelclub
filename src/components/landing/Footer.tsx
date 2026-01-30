import { Logo } from "@/components/Logo";

export function Footer() {
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
              <li><a href="#" className="hover:text-primary-foreground transition-colors">Features</a></li>
              <li><a href="#" className="hover:text-primary-foreground transition-colors">Sports Modes</a></li>
              <li><a href="#" className="hover:text-primary-foreground transition-colors">Mobile App</a></li>
              <li><a href="#" className="hover:text-primary-foreground transition-colors">Pricing</a></li>
            </ul>
          </div>

          <div>
            <h4 className="font-display font-semibold mb-4">Support</h4>
            <ul className="space-y-3 text-sm text-primary-foreground/70">
              <li><a href="#" className="hover:text-primary-foreground transition-colors">Help Center</a></li>
              <li><a href="#" className="hover:text-primary-foreground transition-colors">Contact</a></li>
              <li><a href="#" className="hover:text-primary-foreground transition-colors">Privacy Policy</a></li>
              <li><a href="#" className="hover:text-primary-foreground transition-colors">Terms of Service</a></li>
            </ul>
          </div>
        </div>
      </div>
    </footer>
  );
}
