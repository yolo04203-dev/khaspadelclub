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
        <h1 className="text-3xl font-bold text-foreground mb-2">Privacy Policy — Khas Padel Club</h1>
        <p className="text-sm text-muted-foreground mb-10">Last Updated: February 26, 2026</p>

        <div className="prose prose-invert max-w-none space-y-10 text-muted-foreground">
          <p>
            This Privacy Policy applies to the Khas Padel Club mobile application and website (the "Service"),
            operated by Khas Padel Club ("we", "us", or "our").
          </p>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-4">1. Information We Collect</h2>
            <p>We collect information you provide directly to us when you:</p>
            <ul className="list-disc pl-6 mt-2 space-y-1">
              <li>Create an account</li>
              <li>Join teams or ladders</li>
              <li>Participate in matches or challenges</li>
              <li>Contact support</li>
            </ul>
            <p className="mt-3">This may include:</p>
            <ul className="list-disc pl-6 mt-2 space-y-1">
              <li>Email address</li>
              <li>Display name</li>
              <li>Profile photo (if provided)</li>
              <li>Match history and game statistics</li>
              <li>Device and usage information necessary to operate the app</li>
            </ul>
            <p className="mt-3">
              We do not collect sensitive personal data such as financial information, health data, or precise location.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-4">2. How We Use Your Information</h2>
            <p>We use your information solely to:</p>
            <ul className="list-disc pl-6 mt-2 space-y-1">
              <li>Provide and maintain the Service</li>
              <li>Track rankings, results, and leaderboards</li>
              <li>Enable match scheduling and challenges</li>
              <li>Improve performance and user experience</li>
              <li>Respond to support requests</li>
            </ul>
            <p className="mt-3">We do not sell, rent, or trade your personal data.</p>
            <p className="mt-3">We process your information based on your consent when you create an account and use the Service.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-4">3. Third-Party Services &amp; SDKs</h2>
            <p>We use trusted third-party services necessary to operate the app:</p>
            <ul className="list-disc pl-6 mt-2 space-y-2">
              <li>
                <strong>Sentry</strong> — crash reporting and diagnostics.
                Collects device type, OS version, and anonymized error logs.
                Session replays are configured to mask all text and block all media to prevent capture of personal information.
              </li>
              <li>
                <strong>Google Fonts</strong> — provides typography resources.
                May collect IP address as part of normal web delivery.
              </li>
            </ul>
            <p className="mt-3">
              These providers process data only on our behalf and are bound by privacy obligations.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-4">4. Information Sharing &amp; Public Data</h2>
            <p>The following information is publicly visible within the app:</p>
            <ul className="list-disc pl-6 mt-2 space-y-1">
              <li>Display name</li>
              <li>Team name</li>
              <li>Rankings</li>
              <li>Match results and statistics</li>
            </ul>
            <p className="mt-3">Your email address and private account data are never publicly displayed.</p>
            <p className="mt-2">We do not share personal data with advertisers or data brokers.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-4">5. Data Retention</h2>
            <p>We retain personal data only as long as necessary to provide the Service.</p>
            <ul className="list-disc pl-6 mt-2 space-y-1">
              <li>Account data is retained while active</li>
              <li>If you delete your account, personal information is removed within 30 days</li>
              <li>Anonymous match statistics may be retained to preserve leaderboard accuracy</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-4">6. Data Security</h2>
            <p>We implement industry-standard protections including:</p>
            <ul className="list-disc pl-6 mt-2 space-y-1">
              <li>HTTPS encryption in transit</li>
              <li>Secure authentication tokens</li>
              <li>Controlled database access</li>
              <li>Role-based security policies</li>
            </ul>
            <p className="mt-3">
              No method of transmission is 100% secure, but we continuously improve safeguards.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-4">7. Your Rights &amp; Choices</h2>
            <p>You may:</p>
            <ul className="list-disc pl-6 mt-2 space-y-1">
              <li>Access and update your information anytime</li>
              <li>Request a copy of your data</li>
              <li>Delete your account permanently</li>
              <li>Contact us to exercise privacy rights</li>
            </ul>
            <p className="mt-3">
              Account deletion removes personal data while preserving anonymized match records.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-4">8. Children's Privacy</h2>
            <p>
              Khas Padel Club is not intended for children under 13.
              We do not knowingly collect information from children. If discovered, it will be deleted promptly.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-4">9. International Data Processing</h2>
            <p>
              Your information may be processed on secure servers used to operate the Service.
              We ensure appropriate safeguards are applied regardless of location.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-4">10. Changes to This Policy</h2>
            <p>
              We may update this Privacy Policy periodically.
              Changes will be posted here with an updated revision date.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-4">11. Contact Us</h2>
            <p>If you have questions or privacy requests, contact:</p>
            <ul className="list-none pl-0 mt-2 space-y-1">
              <li><strong>Email:</strong> <a href="mailto:support@khaspadelclub.com" className="text-accent hover:underline">support@khaspadelclub.com</a></li>
              <li><strong>App:</strong> Khas Padel Club</li>
            </ul>
          </section>
        </div>

      </main>
    </div>
  );
}
