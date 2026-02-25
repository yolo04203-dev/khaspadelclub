

## Fix: Category Tabs Too Small / Hidden

The screenshot shows the category tabs ("Category A", "Category B", "Category 40+") are barely visible — the `TabsList` uses `max-w-md` (28rem / 448px) and a grid layout that squeezes each tab into equal fractions. On mobile with 3+ categories, each tab gets ~120px or less, making text clip.

### Changes — `src/pages/LadderDetail.tsx` (lines 562-571)

1. **Remove `max-w-md`** constraint on the `TabsList` — let it use full container width
2. **Switch from `grid` to `flex`** layout so tabs can scroll horizontally when they overflow instead of being crushed
3. **Remove the inline `gridTemplateColumns` style** entirely
4. **Add `w-auto inline-flex`** to TabsList so it can expand naturally
5. **Wrap in a scrollable container** with `overflow-x-auto` and hide scrollbar
6. **Increase tab padding** — add `px-4 py-2.5` to each `TabsTrigger` so they have comfortable touch targets
7. **Bump font size** — change `text-xs sm:text-sm` to `text-sm` so category names are always readable

Result: Tabs remain horizontal, are full-size and readable, and scroll if there are many categories. No more clipping.

### Specific code change

```tsx
// Before (line 562):
<TabsList className="grid w-full max-w-md mx-auto mb-6 overflow-x-auto" style={{ gridTemplateColumns: `repeat(${categories.length}, 1fr)` }}>

// After:
<div className="w-full overflow-x-auto mb-6 scrollbar-hide">
  <TabsList className="inline-flex w-full min-w-max mx-auto">

// Before (line 564):
<TabsTrigger key={cat.id} value={cat.id} className="text-xs sm:text-sm">

// After:
<TabsTrigger key={cat.id} value={cat.id} className="text-sm px-4 py-2.5 whitespace-nowrap">
```

Close the wrapper `</div>` after `</TabsList>`.

Add `.scrollbar-hide` utility to `src/index.css` if not already present:
```css
.scrollbar-hide::-webkit-scrollbar { display: none; }
.scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
```

