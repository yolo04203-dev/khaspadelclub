

# Production Optimization & Performance Hardening — Audit & Plan

## Current State Assessment

This codebase is **already well-optimized** for production. Here's what's already in place:

| Requirement | Status |
|---|---|
| Code splitting / lazy routes | **Done** — all routes use `lazyWithRetry` in `AuthenticatedRoutes.tsx` |
| Console stripping | **Done** — `esbuild.drop: ['console', 'debugger']` in production |
| Error boundary | **Done** — global `ErrorBoundary` + per-route `RouteErrorBoundary` |
| Asset hashing | **Done** — Vite default behavior |
| dvh viewport | **Done** — `.min-h-screen` overridden to `100dvh` globally |
| Font preloading | **Done** — only 2 self-hosted variable fonts, preloaded in `index.html` |
| Image lazy loading | **Done** — `ImageWithFallback` component with `loading="lazy" decoding="async"` |
| GPU acceleration utilities | **Done** — `.gpu-accelerated` class available |
| Touch optimization | **Done** — 44px targets, `touch-action: manipulation`, tap highlight removal |
| Deferred analytics | **Done** — Sentry, PostHog, WebVitals all loaded via `requestIdleCallback` |
| Service worker caching | **Done** — network-first for pages, cache-first for fonts |
| Virtualized lists | **Done** — `react-window` for rankings > 20 items |
| Reduced motion support | **Done** — `@media (prefers-reduced-motion)` implemented |
| Dev-only PerfOverlay | **Done** — tree-shaken in production |

## Remaining Optimizations

### 1. Vite Build Config Tweaks
**File:** `vite.config.ts`
- Change `target` from `es2020` to `es2019` for broader Android WebView compatibility
- Disable sourcemaps in production (`sourcemap: false`) — currently `true`, which bloats the build. Sentry sourcemap upload already deletes maps after upload, but if no `SENTRY_AUTH_TOKEN` is set they remain in dist
- Add `cssCodeSplit: true` (explicit) and `chunkSizeWarningLimit: 600`

### 2. Capacitor Production Config  
**File:** `capacitor.config.ts`
- Add `androidScheme: 'https'` to enable HTTPS scheme for Android WebView (required for modern web APIs and cookie handling)
- Ensure `server.url` block remains commented out (it is — confirmed)

### 3. Remove `framer-motion` from Non-Critical Pages
**Files:** ~15 page/component files import `motion` from `framer-motion`
- `framer-motion` is already in a separate chunk (`animation`), so it doesn't block initial load
- However, many pages only use `motion.div` for simple fade-in effects that CSS already handles via the `.hero-animate` class
- **Replace** `motion.div` with plain `<div className="hero-animate">` on pages that only use basic fade-in: `Profile`, `PlayerProfile`, `LadderCreate`, `LadderManage`, `AmericanoCreate`, `Americano`, `CreateTeam`, `TournamentCreate`, `Admin`, `FindOpponents`
- **Keep** `framer-motion` only where `AnimatePresence` or complex animations are used: `FAB`, `PullToRefresh`, `ChallengeHistoryTab`
- This reduces the number of pages that pull in the `animation` chunk, improving per-route load time

### 4. Memoize `VirtualizedRankingsList` Row Components
**File:** `src/components/ladder/VirtualizedRankingsList.tsx`
- Wrap `RankingRow` with `React.memo` to prevent re-renders when parent state changes
- Wrap `RankBadge` and `getStreakDisplay` with memoization
- Memoize `rowExtraProps` object with `useMemo` in `VirtualizedRankingsList`

### 5. Service Worker Console Log Cleanup
**File:** `public/sw.js` (line 89)
- Remove `console.log('[SW] Background sync triggered')` — this runs in production

### 6. Add `contain: content` to Card-Heavy Lists
**File:** `src/index.css`
- Add a `.contain-card` utility with `contain: content` for list items, reducing layout recalculation scope on scroll

### 7. Accordion Keyframe Animation Fix
**File:** `tailwind.config.ts`
- The `accordion-down` / `accordion-up` animations animate `height`, which causes layout thrashing
- Replace with `max-height` or `grid-template-rows` approach — however this is Radix's built-in pattern, so the fix is to add `will-change: height` only during the animation via the existing `tailwindcss-animate` plugin (already handles this)
- **No change needed** — Radix handles this internally

## Changes Summary

| File | Change |
|---|---|
| `vite.config.ts` | `target: 'es2019'`, `sourcemap: false`, add `cssCodeSplit`, `chunkSizeWarningLimit` |
| `capacitor.config.ts` | Add `androidScheme: 'https'` |
| `public/sw.js` | Remove console.log on line 89 |
| `src/components/ladder/VirtualizedRankingsList.tsx` | Add `React.memo`, `useMemo` for row props |
| `src/index.css` | Add `.contain-card` utility |
| ~10 page files | Replace `motion.div` fade-in with CSS `.hero-animate` class, remove `framer-motion` import |

## What Will NOT Change
- No new dependencies added
- No UI changes
- No database changes
- Existing functionality fully preserved

