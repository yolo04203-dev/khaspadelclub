import * as React from "react";
import { cn } from "@/lib/utils";
import { Button, ButtonProps } from "@/components/ui/button";
import { Slot } from "@radix-ui/react-slot";

interface FABProps extends Omit<ButtonProps, 'asChild'> {
  icon: React.ReactNode;
  label?: string;
  position?: "bottom-right" | "bottom-center" | "bottom-left";
  showLabel?: boolean;
  asChild?: boolean;
}

const FAB = React.forwardRef<HTMLButtonElement, FABProps>(
  ({ icon, label, position = "bottom-right", showLabel = false, className, asChild, children, ...props }, ref) => {
    const positionClasses = {
      "bottom-right": "right-4 sm:right-6",
      "bottom-center": "left-1/2 -translate-x-1/2",
      "bottom-left": "left-4 sm:left-6",
    };

    const buttonClasses = cn(
      "h-14 shadow-lg hover:shadow-xl transition-shadow",
      "bg-accent text-accent-foreground hover:bg-accent/90",
      "active:scale-95 transition-transform",
      "inline-flex items-center justify-center",
      showLabel ? "px-6 rounded-full gap-2" : "w-14 rounded-full",
      className
    );

    const content = (
      <>
        <span className="[&>svg]:w-5 [&>svg]:h-5">{icon}</span>
        {showLabel && label && (
          <span className="font-medium">{label}</span>
        )}
      </>
    );

    // Use CSS animations instead of framer-motion to avoid pulling the animation chunk
    return (
      <div
        className={cn(
          "fixed z-50 animate-scale-in",
          "bottom-[calc(7rem+env(safe-area-inset-bottom))] sm:bottom-6",
          positionClasses[position]
        )}
      >
        {asChild && React.isValidElement(children) ? (
          <Slot
            ref={ref as React.Ref<HTMLElement>}
            className={buttonClasses}
            {...props}
          >
            {React.cloneElement(children as React.ReactElement<{ children?: React.ReactNode }>, {
              children: content
            })}
          </Slot>
        ) : (
          <Button
            ref={ref}
            size={showLabel ? "default" : "icon"}
            className={buttonClasses}
            {...props}
          >
            {content}
          </Button>
        )}
      </div>
    );
  }
);
FAB.displayName = "FAB";

interface FABContainerProps {
  children: React.ReactNode;
  show?: boolean;
}

function FABContainer({ children, show = true }: FABContainerProps) {
  if (!show) return null;
  return <>{children}</>;
}

export { FAB, FABContainer };
