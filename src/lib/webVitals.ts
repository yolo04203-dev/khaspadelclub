/**
 * Lightweight Web Vitals reporter using native PerformanceObserver.
 * Tracks FCP, LCP, CLS, INP, and long tasks without external dependencies.
 */

import * as Sentry from "@sentry/react";
import { logger } from "@/lib/logger";

interface VitalMetric {
  name: string;
  value: number;
  rating: 'good' | 'needs-improvement' | 'poor';
}

const THRESHOLDS: Record<string, [number, number]> = {
  FCP: [1800, 3000],
  LCP: [2500, 4000],
  CLS: [0.1, 0.25],
  INP: [200, 500],
};

function rate(name: string, value: number): VitalMetric['rating'] {
  const [good, poor] = THRESHOLDS[name] || [Infinity, Infinity];
  if (value <= good) return 'good';
  if (value <= poor) return 'needs-improvement';
  return 'poor';
}

function report(metric: VitalMetric) {
  logger.info(`[WebVital] ${metric.name}: ${metric.value.toFixed(1)}ms (${metric.rating})`);

  Sentry.addBreadcrumb({
    category: "web-vital",
    message: `${metric.name}: ${metric.value.toFixed(1)}ms (${metric.rating})`,
    level: metric.rating === "poor" ? "warning" : "info",
    data: { name: metric.name, value: metric.value, rating: metric.rating },
  });
}

export function initWebVitals() {
  if (typeof window === 'undefined' || !('PerformanceObserver' in window)) return;

  // FCP
  try {
    const fcpObserver = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (entry.name === 'first-contentful-paint') {
          report({ name: 'FCP', value: entry.startTime, rating: rate('FCP', entry.startTime) });
          fcpObserver.disconnect();
        }
      }
    });
    fcpObserver.observe({ type: 'paint', buffered: true });
  } catch { /* unsupported */ }

  // LCP
  try {
    let lcpValue = 0;
    const lcpObserver = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      const last = entries[entries.length - 1];
      if (last) lcpValue = last.startTime;
    });
    lcpObserver.observe({ type: 'largest-contentful-paint', buffered: true });

    const reportLCP = () => {
      if (lcpValue > 0) {
        report({ name: 'LCP', value: lcpValue, rating: rate('LCP', lcpValue) });
      }
      lcpObserver.disconnect();
    };
    addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') reportLCP();
    }, { once: true });
  } catch { /* unsupported */ }

  // CLS
  try {
    let clsValue = 0;
    const clsObserver = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (!(entry as any).hadRecentInput) {
          clsValue += (entry as any).value;
        }
      }
    });
    clsObserver.observe({ type: 'layout-shift', buffered: true });

    addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') {
        report({ name: 'CLS', value: clsValue, rating: rate('CLS', clsValue) });
        clsObserver.disconnect();
      }
    }, { once: true });
  } catch { /* unsupported */ }

  // INP
  try {
    let inpValue = 0;
    const inpObserver = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        const duration = (entry as any).duration || 0;
        if (duration > inpValue) inpValue = duration;
      }
    });
    inpObserver.observe({ type: 'event', buffered: true });

    addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden' && inpValue > 0) {
        report({ name: 'INP', value: inpValue, rating: rate('INP', inpValue) });
        inpObserver.disconnect();
      }
    }, { once: true });
  } catch { /* unsupported */ }

  // Long Task Detection (>100ms)
  try {
    const longTaskObserver = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (entry.duration > 100) {
          const attribution = (entry as any).attribution?.[0];
          Sentry.addBreadcrumb({
            category: "performance",
            message: `Long task: ${entry.duration.toFixed(0)}ms`,
            level: entry.duration > 200 ? "warning" : "info",
            data: {
              duration: entry.duration,
              startTime: entry.startTime,
              containerType: attribution?.containerType,
              containerName: attribution?.containerName,
            },
          });
        }
      }
    });
    longTaskObserver.observe({ type: "longtask", buffered: true });
  } catch { /* longtask not supported in all browsers */ }
}
