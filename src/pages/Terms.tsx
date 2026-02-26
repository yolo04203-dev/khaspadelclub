import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Logo } from "@/components/Logo";
import { Button } from "@/components/ui/button";

export default function Terms() {
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
        <h1 className="text-3xl font-bold text-foreground mb-2">Terms of Service — Khas Padel Club</h1>
        <p className="text-sm text-muted-foreground mb-10">Last Updated: February 13, 2026</p>

        <div className="prose prose-invert max-w-none space-y-10 text-muted-foreground">
          <p>
            These Terms of Service ("Terms") govern your use of the Khas Padel Club mobile application and website (the "Service"),
            operated by Khas Padel Club ("we", "us", or "our").
          </p>
          <p>
            By accessing or using the Service, you agree to be bound by these Terms. If you do not agree, you must not use the Service.
            Your use of the Service is also governed by our <Link to="/privacy" className="text-accent hover:underline">Privacy Policy</Link>.
          </p>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-4">1. Eligibility</h2>
            <p>
              You must be at least 13 years old to use the Service.
              By creating an account, you confirm that you meet this requirement and that the information you provide is accurate.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-4">2. Account Registration</h2>
            <p>
              You are responsible for maintaining the confidentiality of your account and for all activities that occur under it.
              You agree to:
            </p>
            <ul className="list-disc pl-6 mt-2 space-y-1">
              <li>Provide accurate and complete information</li>
              <li>Not create duplicate or false accounts</li>
              <li>Notify us of any unauthorized access</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-4">3. Acceptable Use</h2>
            <p>You agree to use the Service fairly and respectfully. You must not:</p>
            <ul className="list-disc pl-6 mt-2 space-y-1">
              <li>Cheat, manipulate rankings, or falsify match results</li>
              <li>Harass, threaten, or abuse other users</li>
              <li>Submit unlawful, offensive, or misleading content</li>
              <li>Attempt to gain unauthorized access to the system</li>
              <li>Use the platform for any illegal purpose</li>
              <li>Impersonate other individuals or teams</li>
              <li>Submit false identity information</li>
              <li>Misuse the platform to mislead or defraud others</li>
            </ul>
            <p className="mt-3">We reserve the right to investigate and take action where necessary.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-4">4. Match Results and Competition Integrity</h2>
            <p>
              All match results must be reported accurately.
              We do not guarantee the accuracy of results submitted by users and reserve the right to adjust rankings if disputes arise.
            </p>
            <p className="mt-3">
              Users are solely responsible for the information they submit. The Service acts only as a platform for coordination and does not verify, endorse, or assume liability for user-generated content.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-4">5. Public Information</h2>
            <p>By participating in matches or teams, you acknowledge that the following may be publicly visible within the app:</p>
            <ul className="list-disc pl-6 mt-2 space-y-1">
              <li>Display name</li>
              <li>Team name</li>
              <li>Rankings</li>
              <li>Match results and statistics</li>
            </ul>
            <p className="mt-3">Private account data such as email address is never publicly displayed.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-4">6. Real-World Activity Disclaimer</h2>
            <p>
              Khas Padel Club facilitates the organization of sporting activity between users but does not organize, supervise, or control physical matches.
            </p>
            <p className="mt-3">We are not responsible for:</p>
            <ul className="list-disc pl-6 mt-2 space-y-1">
              <li>Injuries or accidents</li>
              <li>Disputes between players or teams</li>
              <li>Conduct occurring outside the digital platform</li>
            </ul>
            <p className="mt-3">Participation in matches is entirely at your own risk.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-4">7. Recreational Use Disclaimer</h2>
            <p>
              The Service is intended for recreational sports coordination only. It does not provide professional, medical, or safety supervision of any kind.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-4">8. Account Termination and Deletion</h2>
            <p>We may suspend or terminate accounts that violate these Terms.</p>
            <p className="mt-3">
              You may delete your account at any time through the app settings.
              Upon deletion, your personal data will be removed as described in our Privacy Policy, though anonymized match data may remain for leaderboard integrity.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-4">9. Service Availability and Changes</h2>
            <p>
              We may modify, update, or discontinue features of the Service at any time without prior notice.
              We do not guarantee uninterrupted availability.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-4">10. Intellectual Property</h2>
            <p>
              The app, branding, design, and software are owned by Khas Padel Club. All content, trademarks, and intellectual property associated with the Service are the exclusive property of Khas Padel Club and may not be copied, modified, or redistributed without prior written permission.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-4">11. Fees and Charges</h2>
            <p>
              The Service is currently provided free of charge. We reserve the right to introduce paid features in the future with notice.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-4">12. Limitation of Liability</h2>
            <p>The Service is provided "as is" without warranties of any kind.</p>
            <p className="mt-3">
              To the fullest extent permitted by law, Khas Padel Club shall not be liable for any indirect, incidental,
              consequential, or special damages arising from your use of the Service.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-4">13. Governing Law</h2>
            <p>
              These Terms are governed by the laws applicable in the jurisdiction where the Service operator is established.
              Any disputes shall be resolved through the appropriate courts of that jurisdiction.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-4">14. Changes to These Terms</h2>
            <p>
              We may update these Terms periodically. Continued use of the Service after updates constitutes acceptance of the revised Terms.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-4">15. Severability</h2>
            <p>
              If any provision of these Terms is found to be unenforceable or invalid by a court of competent jurisdiction, that provision shall be limited or eliminated to the minimum extent necessary, and the remaining provisions shall remain in full force and effect.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-4">16. Contact</h2>
            <p>If you have questions regarding these Terms, please contact:</p>
            <ul className="list-none pl-0 mt-2 space-y-1">
              <li><strong>Email:</strong> <a href="mailto:support@khaspadelclub.com" className="text-accent hover:underline">support@khaspadelclub.com</a></li>
            </ul>
          </section>
        </div>
      </main>
    </div>
  );
}
