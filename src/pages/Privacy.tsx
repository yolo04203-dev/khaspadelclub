import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Logo } from "@/components/Logo";
import { Button } from "@/components/ui/button";

export default function Privacy() {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card sticky top-0 z-40">
        <div className="container flex items-center justify-between h-16">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" asChild>
              <Link to="/">
                <ArrowLeft className="w-4 h-4" />
              </Link>
            </Button>
            <Logo size="sm" />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container py-12 max-w-3xl">
        <h1 className="text-3xl font-bold text-foreground mb-8">Privacy Policy</h1>
        
        <div className="prose prose-invert max-w-none space-y-6 text-muted-foreground">
          <section>
            <h2 className="text-xl font-semibold text-foreground mb-4">1. Information We Collect</h2>
            <p>
              We collect information you provide directly to us, such as when you create an account, 
              join a team, or participate in matches. This includes your email address, display name, 
              and game statistics.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-4">2. How We Use Your Information</h2>
            <p>
              We use the information we collect to provide, maintain, and improve our services, 
              including to track your rankings, display leaderboards, and facilitate challenges 
              between teams.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-4">3. Information Sharing</h2>
            <p>
              Your team name, rankings, and match results are publicly visible on the leaderboard. 
              We do not sell your personal information to third parties.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-4">4. Data Security</h2>
            <p>
              We implement appropriate security measures to protect your personal information. 
              However, no method of transmission over the internet is 100% secure.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-4">5. Your Rights</h2>
            <p>
              You can access, update, or delete your account information at any time through 
              your profile settings. Contact us if you need assistance.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-4">6. Contact Us</h2>
            <p>
              If you have any questions about this Privacy Policy, please contact us through 
              our <Link to="/contact" className="text-accent hover:underline">Contact page</Link>.
            </p>
          </section>
        </div>

        <p className="text-sm text-muted-foreground mt-12">
          Last updated: {new Date().toLocaleDateString()}
        </p>
      </main>
    </div>
  );
}
