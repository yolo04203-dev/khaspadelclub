import { AlertTriangle, RefreshCw, WifiOff, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface ErrorStateProps {
  error?: Error | string | null;
  title?: string;
  description?: string;
  onRetry?: () => void;
  isRetrying?: boolean;
  variant?: "card" | "inline" | "fullscreen";
  className?: string;
}

/**
 * Reusable error state component for graceful error display
 */
export function ErrorState({
  error,
  title = "Something went wrong",
  description,
  onRetry,
  isRetrying = false,
  variant = "card",
  className,
}: ErrorStateProps) {
  const errorMessage = error instanceof Error ? error.message : error;
  
  // Detect error type for appropriate icon/messaging
  const isOffline = errorMessage?.toLowerCase().includes("offline") || 
                    errorMessage?.toLowerCase().includes("network");
  const isTimeout = errorMessage?.toLowerCase().includes("timeout") ||
                    errorMessage?.toLowerCase().includes("timed out");

  const Icon = isOffline ? WifiOff : isTimeout ? Clock : AlertTriangle;
  const defaultDescription = isOffline
    ? "You appear to be offline. Check your connection and try again."
    : isTimeout
    ? "The request took too long. Please try again."
    : errorMessage || "An unexpected error occurred. Please try again.";

  const content = (
    <div className={cn("text-center py-8", className)}>
      <div className="flex justify-center mb-4">
        <div className="w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center">
          <Icon className="w-6 h-6 text-destructive" />
        </div>
      </div>
      <h3 className="text-lg font-semibold text-foreground mb-2">{title}</h3>
      <p className="text-muted-foreground text-sm max-w-sm mx-auto mb-4">
        {description || defaultDescription}
      </p>
      {onRetry && (
        <Button onClick={onRetry} disabled={isRetrying} variant="outline" size="sm">
          {isRetrying ? (
            <>
              <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
              Retrying...
            </>
          ) : (
            <>
              <RefreshCw className="w-4 h-4 mr-2" />
              Try Again
            </>
          )}
        </Button>
      )}
    </div>
  );

  if (variant === "inline") {
    return content;
  }

  if (variant === "fullscreen") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        {content}
      </div>
    );
  }

  return (
    <Card className={className}>
      <CardContent className="pt-6">{content}</CardContent>
    </Card>
  );
}

/**
 * Offline banner for network status
 */
export function OfflineBanner({ isVisible }: { isVisible: boolean }) {
  if (!isVisible) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-[100] bg-destructive text-destructive-foreground px-4 py-2 text-center text-sm safe-top">
      <WifiOff className="w-4 h-4 inline-block mr-2" />
      You're offline. Some features may be unavailable.
    </div>
  );
}

/**
 * Slow connection warning banner
 */
export function SlowConnectionBanner({ isVisible }: { isVisible: boolean }) {
  if (!isVisible) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-[100] bg-warning text-warning-foreground px-4 py-2 text-center text-sm safe-top">
      <Clock className="w-4 h-4 inline-block mr-2" />
      Slow connection detected. Content may take longer to load.
    </div>
  );
}
