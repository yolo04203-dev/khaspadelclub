

# Mobile-First UX and Performance Refinement

## Current State Assessment

The app already has strong mobile foundations: safe-area handling, 44px touch targets, bottom navigation, pull-to-refresh, lazy loading, skeleton loaders, service worker caching, and Capacitor integration. This plan focuses on the gaps and refinements still needed.

## Changes Grouped by Impact

### 1. CSS and Layout Tightening (index.css, tailwind.config.ts)

- Reduce `container` default padding from `1rem` to `0.75rem` on screens under 375px for narrow devices
- Add a `xs` breakpoint at `375px` in Tailwind config for fine-grained mobile control
- Replace the leftover `App.css` file entirely (it contains unused Vite boilerplate: `max-width: 1280px`, centered text, logo spin animation) -- either delete it or clear its contents since it conflicts with the mobile layout

### 2. Page-Level Spacing Adjustments (Dashboard, Ladders, Challenges, Stats, Tournaments, Profile)

- Reduce `py-6` to `py-4` on mobile for all page `<main>` containers (keep `sm:py-8` for larger screens)
- Reduce section `mb-8` gaps to `mb-5` on mobile using responsive classes
- Ensure page titles use `text-xl` on mobile instead of `text-2xl`/`text-4xl` (Ladders page uses `text-4xl` which is oversized on phones)

### 3. Remove Heavy framer-motion from Challenge Cards

- Replace `<motion.div>` wrappers on individual challenge cards with CSS `hero-animate` classes already defined in the codebase
- This eliminates per-card JS animation overhead on the Challenges page (which can have 10-20+ cards)
- Keep `AnimatePresence` only for FAB and pull-to-refresh where it provides meaningful UX value

### 4. Optimize PageTransition Component

- Replace framer-motion `PageTransition` with a pure CSS approach using the existing `hero-animate` keyframe
- This removes the `AnimatePresence mode="wait"` wrapper from `AuthenticatedRoutes`, which currently blocks rendering of the incoming page until the outgoing page animation completes (adds ~150ms delay to every navigation)

### 5. Tab Navigation Touch Improvements (Challenges page)

- Increase `TabsTrigger` minimum height to 44px on mobile via a wrapper class
- Show abbreviated labels on mobile instead of hiding them completely (e.g., "In" / "Out" / "Active" / "Hist") so users don't rely solely on icons

### 6. Card Touch Feedback

- Add `press-scale` utility (already defined in CSS) to all tappable `Card` components that act as navigation links (Dashboard quick actions, Ladder cards, Tournament cards)
- This gives immediate tactile feedback on tap

### 7. Stat Cards Compact Layout

- Dashboard stat cards: reduce `CardHeader` internal padding on mobile so the 2x2 grid fits without cramping
- Use `text-xl` instead of `text-2xl` for stat values on very small screens

### 8. Delete App.css Boilerplate

- The `src/App.css` file contains Vite starter template styles (`#root { max-width: 1280px; margin: 0 auto; padding: 2rem; text-align: center; }`) that can interfere with the mobile layout. If this file is imported anywhere, it would cap the layout width and add unnecessary padding. It should be cleared or deleted.

## Technical Details

### Files to Modify

| File | Changes |
|------|---------|
| `src/App.css` | Delete or empty -- unused Vite boilerplate |
| `src/index.css` | Add xs-breakpoint container padding override |
| `tailwind.config.ts` | Add `xs: '375px'` screen breakpoint |
| `src/components/PageTransition.tsx` | Replace framer-motion with CSS animation |
| `src/components/AuthenticatedRoutes.tsx` | Remove AnimatePresence mode="wait" wrapper |
| `src/pages/Dashboard.tsx` | Tighten mobile spacing, add press-scale to action cards |
| `src/pages/Ladders.tsx` | Reduce title from text-4xl to text-2xl on mobile, tighten padding |
| `src/pages/Challenges.tsx` | Replace motion.div cards with CSS, fix tab label visibility, tighten spacing |
| `src/pages/Tournaments.tsx` | Add press-scale to tournament cards, tighten spacing |
| `src/pages/Stats.tsx` | Tighten mobile spacing |

### What Will NOT Change

- No functionality changes
- No database or API changes
- No navigation structure changes (bottom nav already exists and works well)
- No removal of existing accessibility features
- Service worker, lazy loading, query caching, and Capacitor integration remain as-is

