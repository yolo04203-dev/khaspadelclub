import { ReactNode } from "react";
import { LucideIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick?: () => void;
    href?: string;
  };
  children?: ReactNode;
  className?: string;
  variant?: "card" | "inline";
}

/**
 * Reusable empty state component for when data doesn't exist
 */
export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  children,
  className,
  variant = "card",
}: EmptyStateProps) {
  const content = (
    <div className={cn("text-center py-12", variant === "inline" && "py-8", className)}>
      {Icon && (
        <div className="flex justify-center mb-4">
          <Icon className="w-12 h-12 text-muted-foreground" />
        </div>
      )}
      <h3 className="text-lg font-semibold text-foreground mb-2">{title}</h3>
      {description && (
        <p className="text-muted-foreground text-sm max-w-sm mx-auto mb-4">
          {description}
        </p>
      )}
      {action && (
        action.href ? (
          <Button asChild>
            <a href={action.href}>{action.label}</a>
          </Button>
        ) : (
          <Button onClick={action.onClick}>{action.label}</Button>
        )
      )}
      {children}
    </div>
  );

  if (variant === "inline") {
    return content;
  }

  return (
    <Card className={className}>
      <CardContent className="pt-6">{content}</CardContent>
    </Card>
  );
}
