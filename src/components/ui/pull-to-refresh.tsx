import * as React from "react";
import { motion, useMotionValue, useTransform, AnimatePresence } from "framer-motion";
import { RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";

interface PullToRefreshProps {
  children: React.ReactNode;
  onRefresh: () => Promise<void>;
  className?: string;
  disabled?: boolean;
}

const PULL_THRESHOLD = 80;
const MAX_PULL = 120;

export function PullToRefresh({
  children,
  onRefresh,
  className,
  disabled = false,
}: PullToRefreshProps) {
  const [isRefreshing, setIsRefreshing] = React.useState(false);
  const [isPulling, setIsPulling] = React.useState(false);

  const pullDistance = useMotionValue(0);
  const containerRef = React.useRef<HTMLDivElement>(null);
  const startY = React.useRef(0);
  const currentY = React.useRef(0);

  // NOTE: hooks MUST NOT be called conditionally.
  // Keep all motion hooks at the top-level to avoid iOS-only crashes.
  const rotate = useTransform(pullDistance, [0, PULL_THRESHOLD], [0, 360]);
  const scale = useTransform(pullDistance, [0, PULL_THRESHOLD], [0.5, 1]);
  const opacity = useTransform(pullDistance, [0, 30], [0, 1]);
  const indicatorTop = useTransform(pullDistance, [0, MAX_PULL], [-40, 20]);
  const contentY = useTransform(pullDistance, [0, MAX_PULL], [0, MAX_PULL * 0.3]);

  const handleTouchStart = React.useCallback(
    (e: React.TouchEvent) => {
      if (disabled || isRefreshing) return;

      const container = containerRef.current;
      if (!container) return;

      // Only enable pull-to-refresh when scrolled to top
      if (container.scrollTop > 0) return;

      startY.current = e.touches[0]?.clientY ?? 0;
      setIsPulling(true);
    },
    [disabled, isRefreshing]
  );

  const handleTouchMove = React.useCallback(
    (e: React.TouchEvent) => {
      if (!isPulling || disabled || isRefreshing) return;

      const container = containerRef.current;
      if (!container || container.scrollTop > 0) {
        setIsPulling(false);
        pullDistance.set(0);
        return;
      }

      currentY.current = e.touches[0]?.clientY ?? currentY.current;
      const delta = Math.max(0, currentY.current - startY.current);
      const resistance = 0.5; // Add resistance to the pull
      const adjustedDelta = Math.min(delta * resistance, MAX_PULL);

      pullDistance.set(adjustedDelta);

      // On iOS WebKit, touch events can be non-cancelable; guard preventDefault.
      if (delta > 0 && e.cancelable) {
        e.preventDefault();
      }
    },
    [isPulling, disabled, isRefreshing, pullDistance]
  );

  const handleTouchEnd = React.useCallback(async () => {
    if (!isPulling || disabled) return;

    setIsPulling(false);

    const currentPull = pullDistance.get();

    if (currentPull >= PULL_THRESHOLD && !isRefreshing) {
      setIsRefreshing(true);
      pullDistance.set(PULL_THRESHOLD);

      try {
        await onRefresh();
      } finally {
        setIsRefreshing(false);
        pullDistance.set(0);
      }
    } else {
      pullDistance.set(0);
    }
  }, [isPulling, disabled, isRefreshing, pullDistance, onRefresh]);

  // Only show on touch devices
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
    <div
      ref={containerRef}
      className={cn("relative overflow-auto", className)}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      <AnimatePresence>
        {(isPulling || isRefreshing) && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute left-1/2 -translate-x-1/2 z-10 flex items-center justify-center"
            style={{ top: indicatorTop }}
          >
            <motion.div
              className={cn(
                "w-10 h-10 rounded-full bg-card border border-border shadow-lg",
                "flex items-center justify-center"
              )}
              style={{ scale, opacity }}
            >
              <motion.div
                style={{ rotate: isRefreshing ? undefined : rotate }}
                animate={isRefreshing ? { rotate: 360 } : undefined}
                transition={
                  isRefreshing
                    ? { duration: 1, repeat: Infinity, ease: "linear" }
                    : undefined
                }
              >
                <RefreshCw className="w-5 h-5 text-accent" />
              </motion.div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.div style={{ y: contentY }}>{children}</motion.div>
    </div>
  );
}

