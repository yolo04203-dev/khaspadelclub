/**
 * Client-side logging utility for production error tracking
 * All errors are visible in console and can be extended to external services
 */

import { supabase } from "@/integrations/supabase/client";
import * as Sentry from "@sentry/react";

type LogLevel = "debug" | "info" | "warn" | "error";

interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp: string;
  context?: Record<string, unknown>;
  error?: Error;
}

interface ErrorQueueItem {
  message: string;
  stack: string | null;
  page_url: string;
  user_agent: string;
  device_info: Record<string, unknown>;
  severity: string;
}

const LOG_PREFIX = "[App]";
const FLUSH_INTERVAL_MS = 3000;

function getDeviceInfo(): Record<string, unknown> {
  const ua = navigator.userAgent;

  let platform = "web";
  try {
    const cap = (window as any).Capacitor;
    if (cap?.getPlatform) platform = cap.getPlatform();
  } catch { /* noop */ }

  let osVersion = "unknown";
  const iosMatch = ua.match(/OS (\d+[._]\d+[._]?\d*)/);
  const androidMatch = ua.match(/Android (\d+(\.\d+)*)/);
  if (iosMatch) osVersion = `iOS ${iosMatch[1].replace(/_/g, ".")}`;
  else if (androidMatch) osVersion = `Android ${androidMatch[1]}`;

  let networkType = "unknown";
  try {
    const conn = (navigator as any).connection;
    if (conn?.effectiveType) networkType = conn.effectiveType;
  } catch { /* noop */ }

  let isNative = false;
  try {
    isNative = !!(window as any).Capacitor?.isNativePlatform?.();
  } catch { /* noop */ }

  return {
    platform,
    os_version: osVersion,
    network_type: networkType,
    is_native: isNative,
    screen_size: `${window.innerWidth}x${window.innerHeight}`,
  };
}

class Logger {
  private isDevelopment = import.meta.env.DEV;
  private errorQueue: ErrorQueueItem[] = [];
  private flushTimer: ReturnType<typeof setInterval> | null = null;

  constructor() {
    this.startFlushTimer();
  }

  private startFlushTimer() {
    if (this.flushTimer) return;
    this.flushTimer = setInterval(() => this.flush(), FLUSH_INTERVAL_MS);
  }

  private enqueue(message: string, error?: Error | unknown, severity: string = "error") {
    const err = error instanceof Error ? error : (error ? new Error(String(error)) : null);
    this.errorQueue.push({
      message,
      stack: err?.stack || null,
      page_url: window.location.href,
      user_agent: navigator.userAgent,
      device_info: getDeviceInfo(),
      severity,
    });
  }

  private async flush() {
    if (this.errorQueue.length === 0) return;

    const batch = this.errorQueue.splice(0, this.errorQueue.length);

    try {
      let userId: string | null = null;
      try {
        const { data } = await supabase.auth.getSession();
        userId = data.session?.user?.id ?? null;
      } catch { /* noop */ }

      const rows = batch.map(item => ({
        user_id: userId,
        message: item.message.slice(0, 2000),
        stack: item.stack?.slice(0, 10000) || null,
        page_url: item.page_url,
        user_agent: item.user_agent,
        device_info: item.device_info,
        severity: item.severity,
      }));

      await supabase.from("client_errors" as any).insert(rows as any);
    } catch {
      // Never throw from the logger itself
    }
  }

  private formatLog(entry: LogEntry): string {
    return `${LOG_PREFIX} [${entry.level.toUpperCase()}] ${entry.timestamp} - ${entry.message}`;
  }

  private createEntry(
    level: LogLevel,
    message: string,
    context?: Record<string, unknown>,
    error?: Error
  ): LogEntry {
    return { level, message, timestamp: new Date().toISOString(), context, error };
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
    this.enqueue(message, undefined, "warn");

    // Wire to Sentry breadcrumbs
    Sentry.addBreadcrumb({
      category: "logger",
      message,
      level: "warning",
      data: context,
    });
  }

  error(message: string, error?: Error | unknown, context?: Record<string, unknown>): void {
    const err = error instanceof Error ? error : new Error(String(error));
    const entry = this.createEntry("error", message, context, err);
    console.error(this.formatLog(entry), {
      ...context,
      errorMessage: err.message,
      errorStack: err.stack,
    });
    this.enqueue(message, err, "error");

    // Wire to Sentry breadcrumbs
    Sentry.addBreadcrumb({
      category: "logger",
      message,
      level: "error",
      data: { ...context, errorMessage: err.message },
    });
  }

  apiError(operation: string, error: unknown, context?: Record<string, unknown>): void {
    this.error(`API Error: ${operation}`, error, { ...context, operation });
  }

  navigationError(path: string, error: unknown): void {
    this.error(`Navigation Error: Failed to navigate to ${path}`, error, { path });
  }

  authError(action: string, error: unknown): void {
    this.error(`Auth Error: ${action}`, error, { action });
  }

  forceFlush(): void {
    this.flush();
  }
}

export const logger = new Logger();
