import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Logo } from "@/components/Logo";
import { Button } from "@/components/ui/button";

export default function Terms() {
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
        <h1 className="text-3xl font-bold text-foreground mb-8">Terms of Service</h1>
        
        <div className="prose prose-invert max-w-none space-y-6 text-muted-foreground">
          <section>
            <h2 className="text-xl font-semibold text-foreground mb-4">1. Acceptance of Terms</h2>
            <p>
              By accessing and using Khas Padel Club, you agree to be bound by these Terms of Service. 
              If you do not agree to these terms, please do not use our service.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-4">2. Account Registration</h2>
            <p>
              You must provide accurate information when creating an account. You are responsible 
              for maintaining the security of your account and all activities under your account.
              You must be at least 13 years old to create an account.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-4">3. User Conduct</h2>
            <p>
              Users agree to use the platform fairly and honestly. Cheating, harassment, or any 
              form of abuse is strictly prohibited and may result in account suspension.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-4">4. Match Results</h2>
            <p>
              All match results must be reported accurately. Falsifying match results may result 
              in penalties including ranking adjustments or account suspension.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-4">5. Challenges</h2>
            <p>
              Teams must respond to challenges within the specified timeframe. Challenges that 
              expire without response may affect your team's standing.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-4">6. Account Termination</h2>
            <p>
              We may terminate or suspend your account at our discretion for violations of 
              these terms or for any other reason we deem appropriate. You may delete your 
              account at any time through your profile settings, which will remove your 
              personal data as described in our Privacy Policy.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-4">7. Modifications</h2>
            <p>
              We reserve the right to modify these terms at any time. Continued use of the 
              service after changes constitutes acceptance of the new terms.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-4">8. Limitation of Liability</h2>
            <p>
              Khas Padel Club is provided "as is" without warranty of any kind. We shall not be 
              liable for any indirect, incidental, or consequential damages arising from your 
              use of the service.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-4">9. Governing Law</h2>
            <p>
              These Terms of Service shall be governed by and construed in accordance with 
              applicable laws. Any disputes arising from these terms shall be resolved through 
              appropriate legal channels in the jurisdiction where the service operator is established.
            </p>
          </section>
        </div>

        <p className="text-sm text-muted-foreground mt-12">
          Last updated: February 13, 2026
        </p>
      </main>
    </div>
  );
}
