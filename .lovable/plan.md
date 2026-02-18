

## Remove "Players" Tab from Navigation

### Change

**File:** `src/components/AppHeader.tsx`
- Remove `{ to: "/players", label: "Players", icon: Users }` from the `navLinks` array
- Remove `"/players": "Players"` from the `prefetchMap`
- Remove the `Users` import from `lucide-react` (if no longer used elsewhere in the file)

### Result

Navigation will show: **Home | Ladders | Challenges | Tournaments | Stats**

