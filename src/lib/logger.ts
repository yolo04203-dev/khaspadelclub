/**
 * Client-side logging utility for production error tracking
 * All errors are visible in console and can be extended to external services
 */

type LogLevel = "debug" | "info" | "warn" | "error";

interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp: string;
  context?: Record<string, unknown>;
  error?: Error;
}

const LOG_PREFIX = "[App]";

class Logger {
  private isDevelopment = import.meta.env.DEV;

  private formatLog(entry: LogEntry): string {
    return `${LOG_PREFIX} [${entry.level.toUpperCase()}] ${entry.timestamp} - ${entry.message}`;
  }

  private createEntry(
    level: LogLevel,
    message: string,
    context?: Record<string, unknown>,
    error?: Error
  ): LogEntry {
    return {
      level,
      message,
      timestamp: new Date().toISOString(),
      context,
      error,
    };
  }

  debug(message: string, context?: Record<string, unknown>): void {
    if (!this.isDevelopment) return;
    const entry = this.createEntry("debug", message, context);
    console.debug(this.formatLog(entry), context || "");
  }

  info(message: string, context?: Record<string, unknown>): void {
    const entry = this.createEntry("info", message, context);
    console.info(this.formatLog(entry), context || "");
  }

  warn(message: string, context?: Record<string, unknown>): void {
    const entry = this.createEntry("warn", message, context);
    console.warn(this.formatLog(entry), context || "");
  }

  error(message: string, error?: Error | unknown, context?: Record<string, unknown>): void {
    const err = error instanceof Error ? error : new Error(String(error));
    const entry = this.createEntry("error", message, context, err);
    console.error(this.formatLog(entry), {
      ...context,
      errorMessage: err.message,
      errorStack: err.stack,
    });
  }

  /**
   * Log API/network errors with additional context
   */
  apiError(operation: string, error: unknown, context?: Record<string, unknown>): void {
    this.error(`API Error: ${operation}`, error, {
      ...context,
      operation,
    });
  }

  /**
   * Log navigation errors
   */
  navigationError(path: string, error: unknown): void {
    this.error(`Navigation Error: Failed to navigate to ${path}`, error, { path });
  }

  /**
   * Log auth errors
   */
  authError(action: string, error: unknown): void {
    this.error(`Auth Error: ${action}`, error, { action });
  }
}

export const logger = new Logger();
