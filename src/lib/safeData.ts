/**
 * Defensive utilities for safely handling API data
 * Prevents undefined/null crashes from API responses
 */

/**
 * Safely access nested object properties
 */
export function safeGet<T>(
  obj: unknown,
  path: string,
  defaultValue: T
): T {
  const keys = path.split(".");
  let result: unknown = obj;

  for (const key of keys) {
    if (result === null || result === undefined) {
      return defaultValue;
    }
    result = (result as Record<string, unknown>)[key];
  }

  return (result ?? defaultValue) as T;
}

/**
 * Safely handle array data from APIs
 */
export function safeArray<T>(data: T[] | null | undefined): T[] {
  return Array.isArray(data) ? data : [];
}

/**
 * Safely handle string data
 */
export function safeString(value: string | null | undefined, fallback = ""): string {
  return typeof value === "string" ? value : fallback;
}

/**
 * Safely handle number data
 */
export function safeNumber(value: number | null | undefined, fallback = 0): number {
  return typeof value === "number" && !isNaN(value) ? value : fallback;
}

/**
 * Safely handle boolean data
 */
export function safeBoolean(value: boolean | null | undefined, fallback = false): boolean {
  return typeof value === "boolean" ? value : fallback;
}

/**
 * Check if data is empty (null, undefined, empty array, or empty object)
 */
export function isEmpty(value: unknown): boolean {
  if (value === null || value === undefined) return true;
  if (Array.isArray(value)) return value.length === 0;
  if (typeof value === "object") return Object.keys(value).length === 0;
  if (typeof value === "string") return value.trim() === "";
  return false;
}

/**
 * Safely parse JSON with fallback
 */
export function safeJsonParse<T>(json: string | null | undefined, fallback: T): T {
  if (!json) return fallback;
  try {
    return JSON.parse(json) as T;
  } catch {
    return fallback;
  }
}

/**
 * Safely handle count from Supabase queries
 */
export function safeCount(count: number | null | undefined): number {
  return typeof count === "number" ? count : 0;
}
