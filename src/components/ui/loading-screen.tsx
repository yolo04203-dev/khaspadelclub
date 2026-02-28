import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface LoadingScreenProps {
  message?: string;
  className?: string;
  fullScreen?: boolean;
}

/**
 * Consistent loading screen component
 * Used during auth restoration and page loads
 */
export function LoadingScreen({
  message = "Loading...",
  className,
  fullScreen = true,
}: LoadingScreenProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-4 bg-background",
        fullScreen && "min-h-screen",
        className
      )}
    >
      <Loader2 className="w-8 h-8 animate-spin text-primary" />
      {message && (
        <p className="text-sm text-muted-foreground animate-pulse">{message}</p>
      )}
    </div>
  );
}

/**
 * Pure CSS spinner for route-level Suspense fallbacks.
 * Zero JS dependencies — renders instantly without importing lucide-react.
 */
export function RouteLoadingFallback() {
  return (
    <div className="flex items-center justify-center min-h-[60vh] bg-background">
      <div
        className="w-8 h-8 rounded-full border-2 border-muted border-t-primary"
        style={{ animation: "spin .7s linear infinite" }}
      />
    </div>
  );
}

/**
 * Inline loading spinner for smaller contexts
 */
export function LoadingSpinner({ className }: { className?: string }) {
  return <Loader2 className={cn("w-4 h-4 animate-spin", className)} />;
}
