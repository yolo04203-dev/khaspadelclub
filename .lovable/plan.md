

## Replace Category Tabs with Dropdown Select

### Problem
The horizontal scrollable tabs for categories are hard to use on mobile. The user wants a dropdown button instead.

### Change — `src/pages/LadderDetail.tsx` (lines 562-576)

Replace the entire scrollable `TabsList` wrapper (the `relative` div containing the scrollable tabs and fade gradient) with a `Select` dropdown component.

**Before (lines 562-576):**
```tsx
<div className="relative w-full mb-6">
  <div className="overflow-x-auto scrollbar-hide touch-pan-x ...">
    <TabsList>...</TabsList>
  </div>
  <div className="pointer-events-none ..." />
</div>
```

**After:**
```tsx
<div className="w-full mb-6">
  <Select value={activeCategory || undefined} onValueChange={setActiveCategory}>
    <SelectTrigger className="w-full">
      <SelectValue placeholder="Select category" />
    </SelectTrigger>
    <SelectContent>
      {categories.map((cat) => (
        <SelectItem key={cat.id} value={cat.id}>
          {cat.name} ({cat.rankings.length})
        </SelectItem>
      ))}
    </SelectContent>
  </Select>
</div>
```

The `Tabs` wrapper stays for managing `TabsContent` rendering, but the visible `TabsList` is removed and replaced by the `Select`. The `onValueChange` on `Select` calls `setActiveCategory` directly, keeping the same state flow.

**Imports:** Add `Select, SelectContent, SelectItem, SelectTrigger, SelectValue` from `@/components/ui/select`.

No other files change. The dropdown uses the existing `bg-popover` background so it won't be transparent.

