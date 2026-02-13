

# Mobile Performance Testing and Optimization Plan

## Current State Assessment

The app already has a strong performance foundation:
- Lazy-loaded routes with code splitting and prefetching on hover/touch
- Manual Vite chunk splitting (react-vendor, ui-vendor, supabase)
- Web Vitals monitoring (FCP, LCP, CLS, INP)
- Skeleton loaders on all data-heavy pages
- 300ms debounced search, paginated lists (30 items)
- Image lazy loading via `ImageWithFallback`
- `touch-action: manipulation` to eliminate 300ms tap delay
- Preconnect hints for Supabase and Google Fonts
- QueryClient with 2-min stale / 10-min gc caching
- Service worker with network-first caching

## Identified Optimization Gaps

### 1. Heavy Landing Page -- Framer Motion blocks FCP
The `Hero` component eagerly imports `framer-motion` (a ~30KB+ gzipped library) and renders multiple animated elements above the fold. This delays FCP on 3G/4G. The landing page (`Index`) is eagerly loaded along with its animation-heavy children.

### 2. No list virtualization
The memory note mentions `react-window` but no virtualization library is installed or used. The Players page renders up to 30 cards per page without virtualization -- OK for now, but scrolling on low-end devices with 100+ loaded items (via "Load More") will stutter.

### 3. Sentry loaded synchronously on startup
`@sentry/react` is imported at the top of `main.tsx` via `initErrorReporting()`. This adds ~20-30KB to the critical path before the first render.

### 4. Google Fonts render-blocking potential
The font preload strategy uses `onload="this.media='all'"` which is good, but the `preload` link above it may still cause an early network request that competes with critical JS on slow connections.

### 5. No critical CSS inlining
All CSS goes through Tailwind's build pipeline as a single bundle. No critical/above-the-fold CSS extraction.

### 6. Dashboard waterfall queries
The dashboard makes sequential Supabase queries (team member lookup, then team details + rankings, then matches + challenges). This waterfall adds latency on mobile.

### 7. No resource size hints
No `fetchpriority="high"` on the LCP element, no explicit `sizes` attributes on images.

---

## Implementation Plan

### Step 1: Defer Sentry to after first render
Move `initErrorReporting()` from synchronous top-level to a `requestIdleCallback` or `setTimeout` after mount. This removes ~20-30KB from the critical render path.

**Files:** `src/main.tsx`, `src/lib/errorReporting.ts`

### Step 2: Lazy-load framer-motion on landing page
Split the Hero/Features/SportsModes animations so framer-motion is not in the critical bundle for first paint. Use `React.lazy` for the animated landing sections or use CSS animations for above-the-fold content.

**Approach:** Replace the Hero's initial `motion.div` wrappers with plain `div` + CSS `@keyframes` for the fade-in, keeping the decorative animations lazy. This ensures FCP renders content immediately without waiting for framer-motion to parse.

**Files:** `src/components/landing/Hero.tsx`, `src/index.css`

### Step 3: Optimize Vite chunk splitting
Move `framer-motion` out of `ui-vendor` into its own async chunk so it is only loaded when pages that use it are visited. Add `@sentry/react` as a separate chunk.

**Files:** `vite.config.ts`

### Step 4: Add fetchpriority to LCP elements
Add `fetchpriority="high"` on the hero section's primary heading/CTA area and ensure fonts have proper `font-display: swap`.

**Files:** `index.html`

### Step 5: Parallelize Dashboard data fetching
Restructure `fetchDashboardData` to fire the team membership query and use its result in a single `Promise.all` for all dependent queries, reducing the sequential waterfall.

**Files:** `src/pages/Dashboard.tsx`

### Step 6: Add a Performance Testing utility component
Create a dev-only performance overlay that displays FCP, LCP, TTI, and INP in real-time during development, making it easy to validate targets on real devices.

**Files:** `src/components/dev/PerfOverlay.tsx` (dev only, tree-shaken in production)

### Step 7: Add DNS-prefetch for remaining origins
Add `dns-prefetch` hints for any additional third-party origins (e.g., Sentry ingest endpoint if configured).

**Files:** `index.html`

---

## Expected Impact

| Metric | Current (est.) | Target | Optimization |
|--------|---------------|--------|--------------|
| FCP (4G) | ~2.0-2.8s | less than 2.5s | Defer Sentry, CSS animations for hero |
| TTI (4G) | ~2.5-3.5s | less than 3.0s | Lazy framer-motion, chunk splitting |
| FCP (3G) | ~3.5-5.0s | less than 4.0s | Same optimizations, bigger impact |
| INP | less than 200ms | less than 200ms | Already optimized with touch-action |
| Bundle (initial) | ~210KB gz | less than 180KB gz | Sentry + framer-motion deferred |

## Technical Details

### Sentry deferral (main.tsx)
```typescript
// Before: synchronous
initErrorReporting();

// After: deferred
if ('requestIdleCallback' in window) {
  requestIdleCallback(() => initErrorReporting());
} else {
  setTimeout(() => initErrorReporting(), 2000);
}
```

### Hero CSS animations (replacing framer-motion for above-fold)
```css
@keyframes fadeInUp {
  from { opacity: 0; transform: translateY(20px); }
  to { opacity: 1; transform: translateY(0); }
}
.hero-animate {
  animation: fadeInUp 0.6s ease-out both;
}
.hero-animate-delay-1 { animation-delay: 0.2s; }
.hero-animate-delay-2 { animation-delay: 0.3s; }
```

### Vite chunk splitting update
```typescript
manualChunks: {
  'react-vendor': ['react', 'react-dom', 'react-router-dom'],
  'ui-vendor': ['@radix-ui/react-dialog', '@radix-ui/react-tabs', '@radix-ui/react-select', '@radix-ui/react-popover'],
  'animation': ['framer-motion'],
  'charts': ['recharts'],
  'supabase': ['@supabase/supabase-js'],
  'sentry': ['@sentry/react'],
}
```

### Dashboard query parallelization
The current flow is: fetch team_member -> fetch team + rankings -> fetch matches + challenges. The optimized flow fetches team membership first (required), then fires all dependent queries in a single `Promise.all`.

