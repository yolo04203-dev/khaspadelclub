
# Make "Khas Padel Club" Display on One Line

## Problem
The `Logo` component in `src/components/Logo.tsx` renders the brand name as two lines:
- Line 1: **Khas Padel**
- Line 2: **Club** (smaller, uppercase, muted)

## Fix
Merge the text into a single `<span>` that reads **Khas Padel Club** on one line. Remove the wrapping `flex-col` div and the separate "Club" span.

### File: `src/components/Logo.tsx`

**Current (lines 41-46):**
```tsx
{showText && <div className="flex flex-col">
    <span className="font-display font-bold {size} text-foreground leading-tight">Khas Padel</span>
    <span className="font-display font-medium text-xs uppercase tracking-widest text-muted-foreground">
      Club
    </span>
  </div>}
```

**New:**
```tsx
{showText && <span className={`font-display font-bold ${textSizeClasses[size]} text-foreground leading-tight whitespace-nowrap`}>Khas Padel Club</span>}
```

This single change affects every place the `Logo` component is used (landing header, footer, admin header, dashboard, auth page, etc.) since they all render the same component.
