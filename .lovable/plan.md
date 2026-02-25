

# Global Mobile Layout & Safe-Area Refactor

## Problem Analysis

After reviewing the full codebase, the core issues are:

1. **Landing page header** (`Header.tsx`) uses `fixed top-0` without `safe-top` — content renders under notch/status bar on iOS and Android
2. **Hero section** uses `min-h-[90vh]` — broken on iOS Safari
3. **24 page files** use `min-h-screen` (Tailwind's `100vh`) — broken on iOS/Android dynamic viewport
4. **Dashboard** uses `min-h-[calc(100vh-4rem)]` — same issue
5. **Public page headers** (Privacy, Terms, Contact, LadderCreate, LadderManage, etc.) use `sticky top-0` without `safe-top` — content merges with status bar in Capacitor
6. **OfflineBanner and SlowConnectionBanner** use `fixed top-0` without safe-area offset
7. **No global safe-area wrapper** exists — each page must independently handle insets

## Architecture Decision

Instead of patching 24+ individual pages, the fix is applied at **two levels**:

### Level 1: Global CSS — Replace `min-h-screen` behavior
Add a CSS override so Tailwind's `min-h-screen` utility uses `100dvh` instead of `100vh`. This fixes all 24 pages in one stroke without touching any component files.

### Level 2: Structural safe-area fixes for headers
The landing `Header.tsx` and all standalone page headers need `safe-top` class. The `AppHeader` already has it, but pages with custom headers (Privacy, Terms, Contact, LadderCreate, LadderManage, CreateTeam, AmericanoCreate, TournamentCreate, AdminHeader) do not.

---

## Changes

### File 1: `src/index.css`

**What changes:**
- Override Tailwind's `min-h-screen` to use `min-height: 100dvh` with `100vh` fallback — this globally fixes all 24 pages that use `min-h-screen`
- Add a `body`-level safe-area wrapper using `padding-left/right/bottom` for `env(safe-area-inset-*)` so the entire app respects horizontal and bottom safe areas
- Update `.safe-top` fallback from `max(12px, ...)` to `max(16px, ...)` per user requirement
- Replace `min-h-[90vh]` handling: add a utility `.min-h-hero` that uses `90svh`

### File 2: `src/components/landing/Header.tsx`

**What changes:**
- Add `safe-top` class to the `<header>` element so the landing page header sits below the notch/status bar
- The header already uses `fixed top-0` — keep that, but add safe-top padding so content inside clears the system UI

### File 3: `src/components/landing/Hero.tsx`

**What changes:**
- Replace `min-h-[90vh]` with `min-h-[90svh]` (small viewport height) for correct iOS behavior
- Add top padding to account for the fixed header + safe area: `pt-24 sm:pt-28`

### File 4: `src/pages/Index.tsx`

**What changes:**
- Replace `min-h-screen` with `min-h-dvh` (already defined CSS utility)

### File 5: `src/pages/Dashboard.tsx`

**What changes:**
- Replace `min-h-[calc(100vh-4rem)]` with `min-h-[calc(100dvh-4rem)]`

### File 6: Public page headers — add `safe-top` to all standalone headers

The following files have `sticky top-0 z-40` headers without `safe-top`:

| File | Line | Current | Fix |
|------|------|---------|-----|
| `src/pages/Privacy.tsx` | ~10 | `sticky top-0 z-40` | Add `safe-top` |
| `src/pages/Terms.tsx` | ~10 | `sticky top-0 z-40` | Add `safe-top` |
| `src/pages/Contact.tsx` | ~53 | `sticky top-0 z-40` | Add `safe-top` |
| `src/pages/LadderCreate.tsx` | ~175 | `sticky top-0 z-40` | Add `safe-top` |
| `src/pages/LadderManage.tsx` | ~318 | `sticky top-0 z-40` | Add `safe-top` |
| `src/pages/CreateTeam.tsx` | ~163 | No sticky, bare header | Add `safe-top sticky top-0 z-40` |
| `src/pages/AmericanoCreate.tsx` | ~270 | No sticky, bare header | Add `safe-top` |
| `src/pages/TournamentCreate.tsx` | ~178 | No sticky, bare header | Add `safe-top` |
| `src/components/admin/AdminHeader.tsx` | ~8 | `sticky top-0 z-40` | Add `safe-top` |

### File 7: `src/components/ui/error-state.tsx`

**What changes:**
- Add `safe-top` padding to `OfflineBanner` and `SlowConnectionBanner` so they don't render under the notch

### File 8: `src/pages/Auth.tsx`

**What changes:**
- Replace `min-h-screen` with `min-h-dvh` — the auth page is a full-bleed page that must respect dynamic viewport

---

## What This Does NOT Touch
- No UI redesign
- No feature changes
- No per-device hacks
- LadderDetail already uses `min-h-dvh` and `safe-top` from the previous refactor
- AppHeader already has `safe-top`
- Bottom nav already has `safe-bottom`
- VirtualizedRankingsList already optimized from previous refactor

## Technical Detail: Why Override `min-h-screen` Globally

Tailwind's `min-h-screen` compiles to `min-height: 100vh`. On iOS Safari and Android Chrome, `100vh` includes the area behind the URL bar, causing content to extend beyond the visible viewport. By overriding this in CSS:

```css
.min-h-screen {
  min-height: 100vh; /* fallback */
  min-height: 100dvh; /* dynamic viewport height */
}
```

All 24 pages that use `min-h-screen` are fixed simultaneously without editing each file. This is a proper architectural fix, not a per-page workaround.

## Expected Result

- Nothing renders under notch/status bar on any page
- Landing page header clears system UI on Samsung S21 and all iPhones
- All pages use dynamic viewport height (no iOS Safari jumping)
- Horizontal safe areas respected globally via body padding
- No layout shifts, no horizontal scroll
- Works across 320px–desktop

