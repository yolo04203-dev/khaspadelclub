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
 * Inline loading spinner for smaller contexts
 */
export function LoadingSpinner({ className }: { className?: string }) {
  return <Loader2 className={cn("w-4 h-4 animate-spin", className)} />;
}
