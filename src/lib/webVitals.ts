/**
 * Lightweight Web Vitals reporter using native PerformanceObserver.
 * Tracks FCP, LCP, CLS, and INP without external dependencies.
 */

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
  const icon = metric.rating === 'good' ? '✅' : metric.rating === 'needs-improvement' ? '⚠️' : '❌';
  console.log(`${icon} [WebVital] ${metric.name}: ${metric.value.toFixed(1)}ms (${metric.rating})`);
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

    // Report on page hide (final LCP)
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

  // INP (Interaction to Next Paint)
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
}
