import * as React from "react";
import { cn } from "@/lib/utils";

interface PullToRefreshProps {
  children: React.ReactNode;
  onRefresh: () => Promise<void>;
  className?: string;
  disabled?: boolean;
}

// The entire animated internals are in a lazily-loaded component
const PullToRefreshAnimated = React.lazy(() => import("./pull-to-refresh-animated"));

export const PullToRefresh = React.forwardRef<HTMLDivElement, PullToRefreshProps>(
  function PullToRefresh(props, ref) {
    const { children, className, disabled = false } = props;

    const [isTouchDevice, setIsTouchDevice] = React.useState(false);
    React.useEffect(() => {
      setIsTouchDevice(
        typeof window !== "undefined" &&
          ("ontouchstart" in window || navigator.maxTouchPoints > 0)
      );
    }, []);

    if (!isTouchDevice) {
      return <div className={className}>{children}</div>;
    }

    return (
      <React.Suspense fallback={<div className={cn("relative overflow-auto", className)}>{children}</div>}>
        <PullToRefreshAnimated ref={ref} {...props} />
      </React.Suspense>
    );
  }
);
