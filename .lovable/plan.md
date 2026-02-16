
# Production Optimization Plan

## Overview

This plan addresses five areas: mobile responsiveness, performance, UX, database cleanup, and stability. The app already has strong foundations (lazy loading, code splitting, skeleton loaders, 44px touch targets, bottom nav, parallelized queries, virtualized lists). This plan targets the remaining gaps.

## Section 1: Mobile Responsiveness

### 1a. Dashboard team card -- stack on mobile
The team status card (lines 218-234) uses `flex items-center justify-between` which puts the button inline with team info. On 320px screens this overflows. Change to vertical stacking below `sm`:
- Wrap in `flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3`
- Make CTA button `w-full sm:w-auto`

Same fix for the "No team yet" card (lines 239-259).

### 1b. Dashboard stats grid -- 2-column on mobile
Line 265: `grid gap-4 md:grid-cols-2 lg:grid-cols-4` renders as single column on mobile. Change to `grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-2 lg:grid-cols-4` so stats show in a 2x2 grid on small screens.

### 1c. Dashboard quick actions grid -- explicit mobile columns
Line 337: Add `grid-cols-1 sm:grid-cols-2` to ensure single column on phones, 2-col on tablets.

### 1d. Challenges tab bar -- scrollable on narrow screens
Line 685: `grid w-full grid-cols-4` is tight at 320px with icons + text. Change to `flex w-full overflow-x-auto` and give each trigger `flex-1 min-w-0` to allow shrinking. Tabs already hide labels on mobile (`hidden sm:inline`), so this is a safety measure.

### 1e. Landing Header hamburger -- 44px touch target
Line 73-82: The mobile menu button is `p-2 -mr-2` which is only ~40px. Change to `min-h-[44px] min-w-[44px] flex items-center justify-center`.

### 1f. Hero stats -- smaller text on mobile
Line 76: `text-2xl` for stat values can be tight at 320px in a 3-column grid. Change to `text-xl sm:text-2xl`.

### 1g. Global horizontal scroll prevention
Add `overflow-x: hidden` to the `html` rule in `index.css`.

**Files:** `src/pages/Dashboard.tsx`, `src/pages/Challenges.tsx`, `src/components/landing/Header.tsx`, `src/components/landing/Hero.tsx`, `src/index.css`

---

## Section 2: Performance

### 2a. Remove framer-motion from Ladders page
`src/pages/Ladders.tsx` line 117-121 wraps content in `motion.div` for a 0.15s fade. Replace with the existing CSS `hero-animate` class. Remove the `motion` import to avoid loading the animation chunk for this page.

### 2b. Remove framer-motion from landing Header
`src/components/landing/Header.tsx` uses `AnimatePresence` + `motion.div` for the mobile menu toggle. Replace with a CSS transition (height + opacity) using conditional classes and `transition-all duration-200`. Remove `motion` and `AnimatePresence` imports.

### 2c. Remove framer-motion from Challenges page
`src/pages/Challenges.tsx` line 641-644 wraps content in `motion.div` for the same 0.15s fade. Replace with CSS class, remove `motion` import.

### 2d. Font subsetting in index.html
Current Google Fonts URL loads weights 300-700 for both families. Trim to only used weights:
- Inter: `400;500;600`
- Space Grotesk: `500;600;700`

### 2e. Service worker runtime caching
Add cache-first handling for Google Fonts (`fonts.googleapis.com`, `fonts.gstatic.com`) and static image assets in `public/sw.js` to avoid re-fetching on every visit.

### 2f. Add missing database indexes
- `teams.created_by` -- used in admin/seed queries
- `americano_sessions.created_by` -- used on Americano list page

(Notifications table does not exist, so no index needed there. All other hot-path tables are already well-indexed.)

**Files:** `src/pages/Ladders.tsx`, `src/components/landing/Header.tsx`, `src/pages/Challenges.tsx`, `index.html`, `public/sw.js`, plus a database migration

---

## Section 3: UX Improvements

### 3a. Auth page autofocus
Add `autoFocus` to the email input on the login form (line 280) so users can start typing immediately.

### 3b. Dashboard fetch error display
`fetchError` state is set (line 130) but never rendered. Add an `ErrorState` component display when `fetchError` is non-null, with a retry button, between the welcome heading and the team card.

### 3c. Mode breakdown -- replace emoji with Lucide icons
Line 321 uses platform-dependent emojis (`icons = { ladder: "🪜", tournament: "🏆", americano: "🔀" }`). Replace with already-imported Lucide icons: `Layers` for ladder, `Trophy` for tournament, `Shuffle` for americano.

### 3d. Challenges no-team state -- stronger CTA
The no-team card (line 668-682) is functional but plain. Add an icon and a secondary action to "Find Players" for better discoverability.

**Files:** `src/pages/Auth.tsx`, `src/pages/Dashboard.tsx`, `src/pages/Challenges.tsx`

---

## Section 4: Database Cleanup

### 4a. Remove seed data
There are **273 seed teams** (with names like "SEED" or `created_by IS NULL`) plus **512 seed challenges**, **405 seed matches**, and **270 seed ladder rankings** linked to them. Invoke the existing `seed-test-data` edge function with `{ action: "cleanup" }` to remove all this data. (Only 10 real profiles exist.)

### 4b. Add `is_test` column to profiles
Add a boolean `is_test` column (default `false`) to the profiles table via migration. This enables future test accounts to be flagged and filtered in admin views.

### 4c. Add `is_test` filter in Admin TeamsTab
Add a toggle or default filter in the admin Teams tab to hide teams where name contains "SEED" or the new `is_test` flag is set.

**Files:** Database migration, `src/components/admin/TeamsTab.tsx`

---

## Section 5: Stability and Scale

### 5a. Database indexes (covered in Section 2f)
Two new indexes on `teams.created_by` and `americano_sessions.created_by`.

### 5b. Existing infrastructure already handles scale
- QueryClient: 3 retries with exponential backoff (max 30s), 2-min stale time, 10-min GC
- Realtime subscriptions: filtered by ID with 500ms debounce
- Independent error handling per dashboard section (partial rendering on failure)
- Sentry performance tracing + PostHog session replay for monitoring
- Virtualized lists (react-window) for high-volume data
- Server-side pagination with 30-50 item pages

### 5c. Rate limiting note
Client-side rate limiting is already handled by the retry/backoff config. Server-side rate limiting requires infrastructure changes (Edge Function middleware or a Postgres rate-limit table) and is out of scope for this round but recommended as a follow-up.

---

## Implementation Order

1. Database migration (indexes + `is_test` column)
2. Invoke seed cleanup to remove 273 teams + related data
3. Mobile responsiveness fixes (Dashboard, Challenges, Header, Hero, CSS)
4. Performance: remove framer-motion from 3 pages, font subset, SW cache
5. UX: autofocus, error display, icon consistency
6. Admin test data filter

## Technical Details

### Database Migration SQL

```sql
-- Add is_test flag to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_test boolean DEFAULT false;

-- Index for teams.created_by (admin/seed queries)
CREATE INDEX IF NOT EXISTS idx_teams_created_by ON public.teams(created_by);

-- Index for americano_sessions.created_by
CREATE INDEX IF NOT EXISTS idx_americano_sessions_created_by ON public.americano_sessions(created_by);
```

### Files to Modify

| File | Changes |
|---|---|
| `src/index.css` | Add `overflow-x: hidden` to `html` |
| `src/pages/Dashboard.tsx` | Responsive grid tweaks, error display, Lucide icons for mode breakdown |
| `src/pages/Challenges.tsx` | Remove framer-motion, scrollable tab safety |
| `src/pages/Ladders.tsx` | Replace `motion.div` with CSS animation |
| `src/pages/Auth.tsx` | Add `autoFocus` to email input |
| `src/components/landing/Header.tsx` | Replace framer-motion menu with CSS transitions, fix touch target |
| `src/components/landing/Hero.tsx` | Responsive stat font sizes |
| `src/components/admin/TeamsTab.tsx` | Add seed/test data filter toggle |
| `public/sw.js` | Add runtime cache for fonts/icons |
| `index.html` | Trim font weights in Google Fonts URL |

### Seed Data to Remove

| Table | Seed Records |
|---|---|
| Teams | 273 |
| Challenges | 512 |
| Matches | 405 |
| Ladder Rankings | 270 |
| **Real Profiles** | **10 (untouched)** |
