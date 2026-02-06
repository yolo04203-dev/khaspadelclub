import * as React from "react";
import { Button } from "@/components/ui/button";
import { RefreshCw, AlertTriangle, ArrowLeft } from "lucide-react";
import { logger } from "@/lib/logger";

interface RouteErrorBoundaryProps {
  children: React.ReactNode;
  routeName?: string;
}

interface RouteErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}

/**
 * Route-level error boundary that doesn't crash the entire app
 * Shows a recoverable error state within the page layout
 */
export class RouteErrorBoundary extends React.Component<
  RouteErrorBoundaryProps,
  RouteErrorBoundaryState
> {
  constructor(props: RouteErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): Partial<RouteErrorBoundaryState> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    logger.error(`Route error in ${this.props.routeName || "unknown route"}`, error, {
      componentStack: errorInfo.componentStack,
    });
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: undefined });
  };

  handleGoBack = () => {
    try {
      window.history.back();
    } catch {
      window.location.href = "/dashboard";
    }
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-[50vh] flex flex-col items-center justify-center p-6">
          <div className="max-w-md w-full text-center space-y-6">
            <div className="flex justify-center">
              <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center">
                <AlertTriangle className="w-8 h-8 text-destructive" />
              </div>
            </div>

            <div className="space-y-2">
              <h2 className="text-xl font-bold text-foreground">
                This page encountered an error
              </h2>
              <p className="text-muted-foreground text-sm">
                {this.state.error?.message || "Something unexpected happened"}
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button onClick={this.handleRetry} className="gap-2">
                <RefreshCw className="w-4 h-4" />
                Try Again
              </Button>
              <Button variant="outline" onClick={this.handleGoBack} className="gap-2">
                <ArrowLeft className="w-4 h-4" />
                Go Back
              </Button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
