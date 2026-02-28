import { useState } from "react";
import { getSentry } from "@/lib/sentryLazy";
import { isNative, getPlatform } from "@/lib/capacitor";
import { MessageSquare, Send, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

declare const __APP_VERSION__: string;

export function ReportProblemDialog() {
  const [open, setOpen] = useState(false);
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!description.trim()) return;
    setSubmitting(true);

    try {
      const appVersion = typeof __APP_VERSION__ !== "undefined" ? __APP_VERSION__ : "unknown";
      const connection = (navigator as any).connection;

      const Sentry = await getSentry();
      if (Sentry) {
        Sentry.captureFeedback({ message: description.trim() }, { includeReplay: true, attachments: undefined });
        Sentry.setContext("report_context", {
          url: window.location.href,
          app_version: appVersion,
          platform: getPlatform(),
          is_native: isNative(),
          network_type: connection?.effectiveType ?? "unknown",
          online: navigator.onLine,
          timestamp: new Date().toISOString(),
        });
      }

      toast({ title: "Report sent", description: "Thank you for your feedback!" });
      setDescription("");
      setOpen(false);
    } catch {
      toast({ title: "Failed to send", description: "Please try again later.", variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="w-full justify-start">
          <MessageSquare className="w-4 h-4 mr-2" />
          Report Issue / Send Feedback
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Report a Problem</DialogTitle>
          <DialogDescription>
            Describe what went wrong or share your feedback. This helps us improve the app.
          </DialogDescription>
        </DialogHeader>
        <Textarea
          placeholder="What happened? What did you expect?"
          value={description}
          onChange={(e) => setDescription(e.target.value.slice(0, 500))}
          rows={4}
          className="text-base"
        />
        <p className="text-xs text-muted-foreground text-right">{description.length}/500</p>
        <DialogFooter>
          <Button
            onClick={handleSubmit}
            disabled={!description.trim() || submitting}
            className="w-full sm:w-auto"
          >
            {submitting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Send className="w-4 h-4 mr-2" />}
            Send Report
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
