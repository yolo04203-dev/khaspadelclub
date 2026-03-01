

## Make App Responsive to Android System Font Scaling

Android system font scaling (130-150%) causes text clipping, overflow, and layout breaks because many components use fixed heights (`h-10`, `h-12`, `h-16`) that don't expand with scaled text. The fix targets foundational UI components and global CSS so all screens benefit automatically.

### Strategy

Fix at the **component library level** first (buttons, inputs, tabs, headers, selects), then address **page-level layouts** that use rigid heights. This maximizes coverage with minimal file changes.

---

### Changes

**1. `src/components/ui/button.tsx` — Replace fixed `h-*` with `min-h-*` + padding**
- Change `h-10` → remove, keep `min-h-[44px]` + `py-2`
- Change `h-9` → remove, keep `min-h-[36px]` + `py-1.5`
- Change `h-11` → remove, keep `min-h-[44px]` + `py-2.5`
- Icon size: keep `h-10 w-10` but add `h-auto` override
- Remove `whitespace-nowrap` from base — allow button text to wrap when scaled

**2. `src/components/ui/input.tsx` — Flexible input height**
- Replace `h-10` with `min-h-[44px]` + keep `py-2`

**3. `src/components/ui/select.tsx` — Flexible select trigger**
- `SelectTrigger`: Replace `h-10` with `min-h-[44px]`

**4. `src/components/ui/tabs.tsx` — Flexible tab list and triggers**
- `TabsList`: Replace `h-10` with `min-h-[40px] h-auto`
- `TabsTrigger`: Remove `whitespace-nowrap`, add `whitespace-normal text-center`

**5. `src/components/AppHeader.tsx` — Flexible header height**
- Container: Replace `h-16` with `min-h-[64px] h-auto py-2`
- Bottom nav: Add `min-h-[56px] h-auto` and allow label wrapping

**6. `src/components/admin/AdminHeader.tsx` — Same as AppHeader**
- Replace `h-16` with `min-h-[64px] h-auto py-2`

**7. `src/index.css` — Global font-scaling safety net**
- Add global rule: `word-break: break-word` on body
- Add utility class `.font-scale-safe` that applies `overflow-wrap: anywhere`
- Update the `@media (pointer: coarse)` block to use `min-height` instead of `min-height` (already correct) — just verify buttons expand vertically
- Remove the global `input, textarea, select { font-size: 16px !important }` — this fights system font scaling; replace with `font-size: max(16px, 1rem)` so it respects system scale while still preventing iOS zoom

**8. `src/components/ui/navigation-menu.tsx` — Flexible nav trigger**
- Replace `h-10` with `min-h-[40px] h-auto`

**9. `src/components/ui/toggle.tsx` — Flexible toggle heights**
- Replace `h-10`, `h-9`, `h-11` with `min-h-` equivalents

**10. `src/components/ui/menubar.tsx` — Flexible menubar**
- Replace `h-10` with `min-h-[40px] h-auto`

**11. `src/components/ui/fab.tsx` — Flexible FAB**
- Replace `h-14` / `w-14` with `min-h-[56px]` / `min-w-[56px]` + `h-auto`

**12. Page-level fixes (Dashboard, TournamentDetail)**
- `Dashboard.tsx`: `min-h-[120px]` grid already uses min-h (good). Verify stat cards don't clip.
- Any `h-8` on admin action buttons (AdminGroupManagement, AdminRankingControls, KnockoutBracket selects) — change to `min-h-[32px] h-auto`

### What stays unchanged
- Decorative elements with fixed sizes (avatars, icons, rank circles) — these are non-text
- `overflow-hidden` on animation containers (accordion, popover) — structural requirement
- `truncate` on intentionally truncated items (audit log notes, long team names) — by design

### Result
- All text-containing elements expand vertically with system font scaling
- No clipping at 150% font scale
- Layout uses flex + min-height throughout, maintaining visual hierarchy
- Zero design changes at default font size

