

## Performance Optimization -- Remaining Improvements

Most of the 10-point performance checklist is already implemented in this codebase. The plan below targets the remaining gaps.

### What's Already Done (no changes needed)

- All routes use lazy-loaded dynamic imports with retry fallback
- Console/debugger stripping in production builds
- Dashboard stats deferred via requestIdleCallback
- Notifications deferred by 1.5s
- Sentry, PostHog, WebVitals deferred to after first paint
- QueryClient caching (2-min stale, 10-min GC)
- All data fetching uses Promise.all (no sequential blocking)
- Vite manual chunks for vendors, UI, animation, charts, etc.
- Virtualized player list (react-window)
- Skeleton loaders on all major pages
- CSS-based hero animations on landing page
- Preconnect/dns-prefetch hints in index.html
- 0.15s page transitions
- 300ms search debounce

### Remaining Changes

#### 1. Remove framer-motion from Logo component
The Logo uses `motion.img` just for hover/tap scale effects. This forces framer-motion into the critical rendering path for every page. Replace with CSS transitions.

**File:** `src/components/Logo.tsx`
- Replace `motion.img` with a plain `img` tag
- Add CSS `transition: transform 0.15s` with `hover:scale-105 active:scale-95` via Tailwind
- Remove framer-motion import from this file

#### 2. Memoize PlayerCard component
The Players page re-renders all visible cards on every filter/state change.

**File:** `src/pages/Players.tsx`
- Wrap `PlayerCard` in `React.memo`

#### 3. Memoize AppHeader to prevent re-renders
AppHeader re-renders on every route change for all child components.

**File:** `src/components/AppHeader.tsx`
- Wrap the component export in `React.memo`

#### 4. Memoize NotificationBell
Prevent unnecessary re-renders from parent AppHeader.

**File:** `src/components/NotificationBell.tsx`
- Wrap export in `React.memo`

#### 5. Add `fetchPriority="high"` to above-fold logo
The logo in the landing header should load with high priority since it's above the fold.

**File:** `src/components/Logo.tsx`
- Remove `loading="lazy"` (it's above the fold in header)
- Use eager loading for the header logo

### Technical Summary

| File | Change |
|------|--------|
| `src/components/Logo.tsx` | Replace framer-motion with CSS transitions, remove lazy loading |
| `src/pages/Players.tsx` | Wrap `PlayerCard` in `React.memo` |
| `src/components/AppHeader.tsx` | Wrap in `React.memo` |
| `src/components/NotificationBell.tsx` | Wrap in `React.memo` |

### Impact

These changes will:
- Remove framer-motion from the critical render path (it's still loaded for page transitions but now deferred via the animation chunk)
- Reduce unnecessary re-renders across the most-visited components
- Ensure above-fold images load eagerly with high priority
- No UI or functionality changes

