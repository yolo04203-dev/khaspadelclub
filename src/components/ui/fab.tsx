import * as React from "react";
import { cn } from "@/lib/utils";
import { Button, ButtonProps } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";

interface FABProps extends ButtonProps {
  icon: React.ReactNode;
  label?: string;
  position?: "bottom-right" | "bottom-center" | "bottom-left";
  showLabel?: boolean;
}

const FAB = React.forwardRef<HTMLButtonElement, FABProps>(
  ({ icon, label, position = "bottom-right", showLabel = false, className, ...props }, ref) => {
    const positionClasses = {
      "bottom-right": "right-4 sm:right-6",
      "bottom-center": "left-1/2 -translate-x-1/2",
      "bottom-left": "left-4 sm:left-6",
    };

    return (
      <motion.div
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0, opacity: 0 }}
        transition={{ type: "spring", stiffness: 260, damping: 20 }}
        className={cn(
          "fixed bottom-20 sm:bottom-6 z-50",
          positionClasses[position]
        )}
      >
        <Button
          ref={ref}
          size={showLabel ? "default" : "icon"}
          className={cn(
            "h-14 shadow-lg hover:shadow-xl transition-shadow",
            "bg-accent text-accent-foreground hover:bg-accent/90",
            "active:scale-95 transition-transform",
            showLabel ? "px-6 rounded-full gap-2" : "w-14 rounded-full",
            className
          )}
          {...props}
        >
          <span className="[&>svg]:w-5 [&>svg]:h-5">{icon}</span>
          {showLabel && label && (
            <span className="font-medium">{label}</span>
          )}
        </Button>
      </motion.div>
    );
  }
);
FAB.displayName = "FAB";

interface FABContainerProps {
  children: React.ReactNode;
  show?: boolean;
}

function FABContainer({ children, show = true }: FABContainerProps) {
  return (
    <AnimatePresence>
      {show && children}
    </AnimatePresence>
  );
}

export { FAB, FABContainer };
