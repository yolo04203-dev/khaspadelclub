

## Add Tournaments Tab to Navigation

Add a "Tournaments" entry to the top navigation bar (desktop) and bottom navigation bar (mobile) so users can quickly access the Tournaments page.

### Change

**File:** `src/components/AppHeader.tsx`
- Add a new entry to the `navLinks` array: `{ to: "/tournaments", label: "Tournaments", icon: LayoutGrid }`
- Import the `LayoutGrid` icon from `lucide-react` (already used in the Admin page for tournaments)
- Add `"/tournaments": "Tournaments"` to the `prefetchMap` for route prefetching

### Result

The navigation will show: **Home | Ladders | Challenges | Players | Tournaments | Stats** on both desktop (top bar) and mobile (bottom bar).

