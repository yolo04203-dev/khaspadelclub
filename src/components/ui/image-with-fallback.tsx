import { useState, useCallback, ImgHTMLAttributes } from "react";
import { ImageOff, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";

interface ImageWithFallbackProps extends ImgHTMLAttributes<HTMLImageElement> {
  fallbackSrc?: string;
  showRetry?: boolean;
}

export function ImageWithFallback({
  src,
  alt = "",
  className,
  fallbackSrc,
  showRetry = true,
  ...props
}: ImageWithFallbackProps) {
  const [hasError, setHasError] = useState(false);
  const [retryCount, setRetryCount] = useState(0);

  const handleError = useCallback(() => {
    setHasError(true);
  }, []);

  const handleRetry = useCallback(() => {
    setHasError(false);
    setRetryCount((c) => c + 1);
  }, []);

  if (hasError && !fallbackSrc) {
    return (
      <div
        className={cn(
          "flex flex-col items-center justify-center bg-muted rounded-md gap-2",
          className
        )}
        role="img"
        aria-label={alt || "Image failed to load"}
      >
        <ImageOff className="w-6 h-6 text-muted-foreground" />
        {showRetry && (
          <button
            onClick={handleRetry}
            className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 touch-manipulation min-h-[44px] min-w-[44px] justify-center"
            aria-label="Retry loading image"
          >
            <RefreshCw className="w-3 h-3" />
            Retry
          </button>
        )}
      </div>
    );
  }

  const resolvedSrc = hasError && fallbackSrc
    ? fallbackSrc
    : `${src}${retryCount > 0 ? `?r=${retryCount}` : ""}`;

  return (
    <img
      src={resolvedSrc}
      alt={alt}
      className={className}
      onError={handleError}
      loading="lazy"
      decoding="async"
      {...props}
    />
  );
}
