import * as React from "react";
import { Button } from "@/components/ui/button";
import { RefreshCw, AlertTriangle, Home, Copy, Check } from "lucide-react";
import { reportError } from "@/lib/errorReporting";
import { logger } from "@/lib/logger";

interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
  errorInfo?: React.ErrorInfo;
  copied: boolean;
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, copied: false };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Log error details for debugging
    logger.error("ErrorBoundary caught error", error, {
      componentStack: errorInfo.componentStack || undefined,
    });
    reportError(error, { componentStack: errorInfo.componentStack });
    this.setState({ errorInfo });
  }

  handleReload = () => {
    // Clear any cached state that might cause the error
    try {
      sessionStorage.clear();
    } catch (e) {
      // Storage might not be available
    }
    window.location.reload();
  };

  handleGoHome = () => {
    // Navigate to home and reload to clear state
    window.location.href = "/";
  };

  handleCopyError = async () => {
    const { error, errorInfo } = this.state;
    const errorDetails = `
Error: ${error?.message || "Unknown error"}
Stack: ${error?.stack || "No stack trace"}
Component Stack: ${errorInfo?.componentStack || "No component stack"}
URL: ${window.location.href}
User Agent: ${navigator.userAgent}
Timestamp: ${new Date().toISOString()}
    `.trim();

    try {
      await navigator.clipboard.writeText(errorDetails);
      this.setState({ copied: true });
      setTimeout(() => this.setState({ copied: false }), 2000);
    } catch (e) {
      logger.error("Failed to copy error details", e);
    }
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-background">
          <div className="max-w-md w-full text-center space-y-6">
            <div className="flex justify-center">
              <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center">
                <AlertTriangle className="w-8 h-8 text-destructive" />
              </div>
            </div>
            
            <div className="space-y-2">
              <h1 className="text-2xl font-bold text-foreground">Something went wrong</h1>
              <p className="text-muted-foreground">
                We're sorry, but something unexpected happened. Please try reloading the page.
              </p>
            </div>

            {/* Error details (collapsed by default) */}
            {this.state.error && (
              <details className="text-left bg-muted/50 rounded-lg p-4">
                <summary className="cursor-pointer text-sm text-muted-foreground hover:text-foreground">
                  View error details
                </summary>
                <div className="mt-3 space-y-2">
                  <p className="text-xs font-mono text-destructive break-all">
                    {this.state.error.message}
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={this.handleCopyError}
                    className="w-full text-xs"
                  >
                    {this.state.copied ? (
                      <>
                        <Check className="w-3 h-3 mr-2" />
                        Copied!
                      </>
                    ) : (
                      <>
                        <Copy className="w-3 h-3 mr-2" />
                        Copy error for support
                      </>
                    )}
                  </Button>
                </div>
              </details>
            )}

            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button onClick={this.handleReload} className="gap-2">
                <RefreshCw className="w-4 h-4" />
                Reload Page
              </Button>
              <Button variant="outline" onClick={this.handleGoHome} className="gap-2">
                <Home className="w-4 h-4" />
                Go to Home
              </Button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
