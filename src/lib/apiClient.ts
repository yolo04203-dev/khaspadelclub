import { supabase } from "@/integrations/supabase/client";
import { reportApiError } from "@/lib/errorReporting";
import * as Sentry from "@sentry/react";

export type AppErrorCode =
  | "offline"
  | "timeout"
  | "auth_expired"
  | "forbidden"
  | "not_found"
  | "validation"
  | "server_error"
  | "unknown";

export class AppError extends Error {
  code: AppErrorCode;
  status?: number;
  details?: unknown;

  constructor(code: AppErrorCode, message: string, status?: number, details?: unknown) {
    super(message);
    this.name = "AppError";
    this.code = code;
    this.status = status;
    this.details = details;
  }
}

const DEFAULT_TIMEOUT = 15_000;

function normalizeError(error: unknown, status?: number): AppError {
  if (error instanceof AppError) return error;

  if (!navigator.onLine) {
    return new AppError("offline", "You appear to be offline. Check your connection and try again.");
  }

  if (error instanceof DOMException && error.name === "AbortError") {
    return new AppError("timeout", "Request timed out. Please try again.");
  }

  if (status === 401) {
    return new AppError("auth_expired", "Your session has expired. Please sign in again.", 401);
  }
  if (status === 403) {
    return new AppError("forbidden", "You don't have permission for this action.", 403);
  }
  if (status === 404) {
    return new AppError("not_found", "The requested resource was not found.", 404);
  }
  if (status === 422) {
    return new AppError("validation", "Please check your input and try again.", 422, error);
  }
  if (status && status >= 500) {
    return new AppError("server_error", "Something went wrong on our end. Please try again later.", status);
  }

  const message = error instanceof Error ? error.message : "An unexpected error occurred.";
  return new AppError("unknown", message, status);
}

interface RequestOptions {
  timeout?: number;
  signal?: AbortSignal;
}

async function request<T>(
  method: string,
  url: string,
  body?: unknown,
  options: RequestOptions = {}
): Promise<T> {
  const { timeout = DEFAULT_TIMEOUT, signal: externalSignal } = options;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  // Link external signal
  if (externalSignal) {
    externalSignal.addEventListener("abort", () => controller.abort());
  }

  const isIdempotent = ["GET", "HEAD"].includes(method.toUpperCase());
  let lastError: unknown;

  const maxAttempts = isIdempotent ? 2 : 1;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const startTime = Date.now();
    try {
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: body ? JSON.stringify(body) : undefined,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      Sentry.addBreadcrumb({
        category: "http",
        message: `${method} ${url}`,
        level: res.ok ? "info" : "warning",
        data: { method, url, status_code: res.status, duration_ms: Date.now() - startTime },
      });

      if (!res.ok) {
        const errorBody = await res.json().catch(() => null);
        throw normalizeError(errorBody, res.status);
      }

      return (await res.json()) as T;
    } catch (err) {
      lastError = err;
      if (!isIdempotent || attempt === maxAttempts - 1) break;
    }
  }

  clearTimeout(timeoutId);
  const appError = normalizeError(lastError);
  reportApiError(method, appError, { endpoint: url, status: appError.status });
  throw appError;
}

export const apiClient = {
  get: <T>(url: string, opts?: RequestOptions) => request<T>("GET", url, undefined, opts),
  post: <T>(url: string, body?: unknown, opts?: RequestOptions) => request<T>("POST", url, body, opts),
  put: <T>(url: string, body?: unknown, opts?: RequestOptions) => request<T>("PUT", url, body, opts),
  delete: <T>(url: string, opts?: RequestOptions) => request<T>("DELETE", url, undefined, opts),

  /** Invoke a Supabase edge function with timeout + error normalization */
  async invoke<T = unknown>(
    functionName: string,
    body?: unknown,
    options: RequestOptions = {}
  ): Promise<T> {
    const { timeout = DEFAULT_TIMEOUT } = options;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      const { data, error } = await supabase.functions.invoke(functionName, {
        body: body as Record<string, unknown>,
      });

      clearTimeout(timeoutId);

      if (error) {
        throw normalizeError(error);
      }

      return data as T;
    } catch (err) {
      clearTimeout(timeoutId);
      if (err instanceof AppError) throw err;
      const appError = normalizeError(err);
      reportApiError(`invoke:${functionName}`, appError);
      throw appError;
    }
  },
};
