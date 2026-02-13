/**
 * Performance budget constants.
 * These targets guide development decisions and can be checked in CI/profiling.
 */
export const PERF_BUDGET = {
  /** Target scroll frame rate (fps) */
  SCROLL_FPS: 60,
  /** Time to Interactive on 4G (ms) */
  TTI_MAX_MS: 2500,
  /** Maximum tap-to-response latency (ms) */
  TAP_LATENCY_MAX_MS: 100,
  /** Long task threshold (ms) — tasks above this block the main thread */
  LONG_TASK_MS: 50,
  /** Maximum initial bundle size (KB, gzipped) */
  BUNDLE_SIZE_KB: 200,
  /** Target concurrent users the app must support */
  CONCURRENT_USERS_TARGET: 1000,
  /** Maximum acceptable API response time (ms) */
  API_RESPONSE_MAX_MS: 1000,
  /** Maximum acceptable error rate under load (%) */
  LOAD_ERROR_RATE_MAX_PCT: 5,
} as const;
