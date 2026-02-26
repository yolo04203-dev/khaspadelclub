import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Logo } from "@/components/Logo";
import { Button } from "@/components/ui/button";

export default function DeleteAccount() {
  return (
    <div className="min-h-screen bg-background">
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

      <main className="container py-12 max-w-3xl">
        <h1 className="text-3xl font-bold text-foreground mb-10">Delete Your Khas Padel Club Account</h1>

        <div className="prose prose-invert max-w-none space-y-10 text-muted-foreground">
          <section>
            <h2 className="text-xl font-semibold text-foreground mb-4">How to Delete Your Account</h2>
            <p>You can delete your account directly from the app by following these steps:</p>
            <ol className="list-decimal pl-6 mt-3 space-y-2">
              <li>Log in to the app</li>
              <li>Go to <strong>Profile → Settings</strong></li>
              <li>Tap <strong>"Delete Account"</strong></li>
              <li>Confirm deletion</li>
            </ol>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-4">What Data Is Deleted</h2>
            <p>
              Personal information — including your email address, display name, and profile photo — is permanently removed within 30 days of your deletion request.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-4">What Data May Be Retained</h2>
            <p>
              Anonymous match statistics may remain to preserve leaderboard integrity. These records contain no personally identifiable information.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-4">Need Help?</h2>
            <p>
              If you need assistance or have questions about account deletion, contact us at{" "}
              <a href="mailto:support@khaspadelclub.com" className="text-accent hover:underline">
                support@khaspadelclub.com
              </a>.
            </p>
          </section>
        </div>
      </main>
    </div>
  );
}
