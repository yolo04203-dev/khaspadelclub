

## Plan: Production Build Optimization for Mobile WebView

### Current State
- **vite.config.ts** already has manual chunks, `es2019` target, esbuild minify, CSS code splitting, and console stripping
- Source maps are conditionally enabled (only when `SENTRY_AUTH_TOKEN` exists)
- Dev-only `PerfOverlay` is conditionally imported but still referenced in `App.tsx`
- `perfBudget.ts` is a constants-only file (harmless, tree-shaken if unused)
- Chunk splitting groups several Radix packages together but misses opportunities for finer granularity

### Changes

#### 1. `vite.config.ts` — Aggressive production build config
- **Disable source maps entirely** (`sourcemap: false`)
- **Switch from esbuild to terser** for minification with aggressive compression (`passes: 3`, `pure_getters: true`, `unsafe_comps: true`, drop `console`/`debugger`)
- **Refine manual chunks**: split `react` core from `react-router-dom`; isolate `@tanstack/react-query` and `@supabase/supabase-js` into their own chunks; group all Radix UI into one `ui-vendor` chunk; keep `framer-motion`, `recharts`, `sentry`, `posthog` separate
- **Lower chunk size warning limit** to 400KB
- **Add `modulePreload.polyfill: false`** (WebView supports native module preload)

#### 2. `src/App.tsx` — Remove dev PerfOverlay from production bundle
- Remove the `PerfOverlay` import and its `Suspense` wrapper entirely. It is already tree-shaken via `import.meta.env.DEV` but the conditional dynamic import still produces a chunk. Replace with a cleaner guard that eliminates any production trace.

#### 3. Install `terser` as a dev dependency
- Required for Vite's terser minification mode (not bundled with Vite by default).

### No changes needed
- `index.html` viewport-fit=cover is already set
- `lazyWithRetry` and route-level splitting are already optimal
- `perfBudget.ts` and `webVitals.ts` are deferred and tree-shakeable — no action needed

