import { useEffect, useState } from "react";

interface Metrics {
  fcp: number | null;
  lcp: number | null;
  cls: number | null;
  inp: number | null;
}

/**
 * Dev-only performance overlay. Displays real-time Core Web Vitals.
 * Tree-shaken in production via the conditional render in App.
 */
export function PerfOverlay() {
  const [metrics, setMetrics] = useState<Metrics>({ fcp: null, lcp: null, cls: null, inp: null });
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    // FCP
    const fcpObs = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (entry.name === "first-contentful-paint") {
          setMetrics((m) => ({ ...m, fcp: Math.round(entry.startTime) }));
        }
      }
    });
    fcpObs.observe({ type: "paint", buffered: true });

    // LCP
    const lcpObs = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      const last = entries[entries.length - 1];
      if (last) setMetrics((m) => ({ ...m, lcp: Math.round(last.startTime) }));
    });
    lcpObs.observe({ type: "largest-contentful-paint", buffered: true });

    // CLS
    let clsValue = 0;
    const clsObs = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (!(entry as any).hadRecentInput) {
          clsValue += (entry as any).value;
          setMetrics((m) => ({ ...m, cls: Math.round(clsValue * 1000) / 1000 }));
        }
      }
    });
    clsObs.observe({ type: "layout-shift", buffered: true });

    // INP
    const inpObs = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        setMetrics((m) => {
          const dur = Math.round(entry.duration);
          return { ...m, inp: m.inp === null ? dur : Math.max(m.inp, dur) };
        });
      }
    });
    try { inpObs.observe({ type: "event", buffered: true }); } catch {}

    return () => {
      fcpObs.disconnect();
      lcpObs.disconnect();
      clsObs.disconnect();
      inpObs.disconnect();
    };
  }, []);

  if (!visible) return null;

  const fmt = (v: number | null, unit: string, warn: number) => {
    if (v === null) return <span className="text-muted-foreground">--</span>;
    const color = v <= warn ? "text-green-400" : "text-red-400";
    return <span className={color}>{v}{unit}</span>;
  };

  return (
    <div
      className="fixed bottom-2 left-2 z-[9999] bg-black/80 text-white text-xs font-mono px-3 py-2 rounded-lg shadow-lg flex gap-3 items-center cursor-pointer select-none"
      onClick={() => setVisible(false)}
      title="Click to dismiss"
    >
      <span>FCP {fmt(metrics.fcp, "ms", 2500)}</span>
      <span>LCP {fmt(metrics.lcp, "ms", 2500)}</span>
      <span>CLS {fmt(metrics.cls, "", 0.1)}</span>
      <span>INP {fmt(metrics.inp, "ms", 200)}</span>
    </div>
  );
}
