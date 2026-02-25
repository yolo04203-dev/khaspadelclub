

## Fix: "Pending" Badge Overlapping Points on Mobile

### Problem
The "Pending" badge on mobile ranking cards is positioned as an absolute element in the top-right corner, overlapping the points display ("1000 pts") as visible in the screenshot.

### Solution
Replace the text "Pending" badge on mobile with a small `Clock` icon that takes up minimal space. This avoids the overlap entirely while still clearly indicating a pending challenge.

### Changes — `src/components/ladder/VirtualizedRankingsList.tsx`

**1. Import `Clock` icon** (add to existing lucide-react import)

**2. Line 98-100 — Replace mobile absolute "Pending" badge with a small icon**

Before:
```tsx
{ranking.team && pendingSet.has(ranking.team.id) && (
  <Badge variant="secondary" className="absolute top-2 right-2 text-xs sm:hidden z-10">Pending</Badge>
)}
```

After:
```tsx
{ranking.team && pendingSet.has(ranking.team.id) && (
  <TooltipProvider>
    <Tooltip>
      <TooltipTrigger asChild>
        <div className="absolute top-2 right-2 sm:hidden z-10">
          <Clock className="w-4 h-4 text-muted-foreground" />
        </div>
      </TooltipTrigger>
      <TooltipContent>Challenge Pending</TooltipContent>
    </Tooltip>
  </TooltipProvider>
)}
```

This replaces the wide "Pending" text badge with a compact 16x16px clock icon. The tooltip provides context on tap/hover. The desktop "Pending" badge (line 172) stays unchanged since it has enough space.

