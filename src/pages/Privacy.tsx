import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Logo } from "@/components/Logo";
import { Button } from "@/components/ui/button";

export default function Privacy() {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card sticky top-0 z-40 safe-top">
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
              Khas Padel Club collects information you provide directly to us, such as when you create an account, 
              join a team, or participate in matches. This includes your email address, display name, 
              profile photo, and game statistics.
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
            <h2 className="text-xl font-semibold text-foreground mb-4">3. Third-Party Services &amp; SDKs</h2>
            <p>
              Our app uses the following third-party services that may collect data:
            </p>
            <ul className="list-disc pl-6 mt-2 space-y-1">
              <li><strong>Sentry</strong> — crash reporting and error monitoring. Collects device info, OS version, and anonymized error data. Session replays are configured to mask all text and block all media to prevent PII capture.</li>
              <li><strong>Google Fonts</strong> — font delivery. May collect IP addresses as part of standard web requests.</li>
            </ul>
            <p className="mt-2">
              We do not sell your personal information to third parties.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-4">4. Information Sharing</h2>
            <p>
              Your team name, rankings, and match results are publicly visible on the leaderboard. 
              Your email address and phone number are never publicly displayed.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-4">5. Data Retention</h2>
            <p>
              We retain your personal data for as long as your account is active. Match history and 
              statistics are retained indefinitely to maintain leaderboard integrity. If you delete 
              your account, your personal information (email, display name, profile photo) will be 
              permanently removed within 30 days. Anonymized match statistics may be retained.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-4">6. Data Security</h2>
            <p>
              We implement appropriate security measures to protect your personal information, 
              including encryption in transit (HTTPS), row-level security on database access, 
              and secure token-based authentication. However, no method of transmission over 
              the internet is 100% secure.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-4">7. Your Rights</h2>
            <p>
              You have the right to:
            </p>
            <ul className="list-disc pl-6 mt-2 space-y-1">
              <li>Access your personal data through your profile settings</li>
              <li>Update or correct your information at any time</li>
              <li>Request a copy of your data (data portability)</li>
              <li>Delete your account and associated personal data from your profile settings</li>
            </ul>
            <p className="mt-2">
              Contact us if you need assistance exercising any of these rights.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-4">8. Children's Privacy</h2>
            <p>
              Khas Padel Club is not intended for children under the age of 13. We do not knowingly 
              collect personal information from children under 13. If we become aware that we have 
              collected personal data from a child under 13, we will take steps to delete that 
              information promptly. If you believe a child under 13 has provided us with personal 
              information, please contact us.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-4">9. Changes to This Policy</h2>
            <p>
              We may update this Privacy Policy from time to time. We will notify you of any 
              material changes by posting the new policy on this page and updating the "Last updated" 
              date below.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-4">10. Contact Us</h2>
            <p>
              If you have any questions about this Privacy Policy, please contact us through 
              our <Link to="/contact" className="text-accent hover:underline">Contact page</Link>.
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
