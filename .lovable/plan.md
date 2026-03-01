

## Fix: Tournament Detail back arrow overlapping notification bar

The tournament detail page header (line 1746 in `TournamentDetail.tsx`) is missing the `safe-top` class that other pages use to clear the system notification bar on Android devices.

**Current** (line 1746):
```html
<header className="border-b border-border bg-card">
```

**Fixed**:
```html
<header className="border-b border-border bg-card sticky top-0 z-40 safe-top">
```

This single-line change adds:
- `safe-top` — applies minimum 28px top padding to clear the Samsung S21 FE notification bar
- `sticky top-0 z-40` — matches the header pattern used on Admin, DeleteAccount, and other pages

This is the same pattern already used in `AdminHeader.tsx` (line 5) and `DeleteAccount.tsx` (line 10).

